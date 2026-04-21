-- Audit log for clinical-record tables.
--
-- Every INSERT/UPDATE/DELETE on case_logs and procedure_logs writes a
-- row capturing who did it, when, and a JSON snapshot of the row before
-- and after. This is a compliance-grade audit trail — required under
-- GDPR Art. 30 and HIPAA §164.312(b) for access to clinical data.
--
-- Design notes:
--   * Append-only: there is no UPDATE/DELETE grant on audit_log.
--   * actor_id falls back to the JWT sub claim; for service-role writes
--     (sync worker, edge functions) it will be NULL and the row's
--     owner_id is preserved in the snapshot.
--   * Partitioning is deliberately omitted at v1 — can be added later
--     with pg_partman when volume justifies it.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID,                            -- auth.users.id when available
  action      TEXT    NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name  TEXT    NOT NULL,
  row_id      TEXT    NOT NULL,                -- TEXT because our PKs are uuid strings
  before_data JSONB,
  after_data  JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_row
  ON public.audit_log (table_name, row_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log (actor_id, occurred_at DESC);

-- Lock it down: no direct writes from authenticated / anon. Only the
-- trigger (which runs as the table owner) can INSERT.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Read policy: admins see everything; other users see only audit rows
-- that relate to records they own. Relies on app_metadata.role = 'admin'
-- set via the admin Edge Function.
DROP POLICY IF EXISTS audit_log_select_own ON public.audit_log;
CREATE POLICY audit_log_select_own ON public.audit_log
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR actor_id = auth.uid()
    OR (after_data  ->> 'owner_id')::uuid = auth.uid()
    OR (before_data ->> 'owner_id')::uuid = auth.uid()
  );

-- No INSERT/UPDATE/DELETE policies → denied by default.

-- ─── Trigger function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_row_id TEXT;
BEGIN
  -- auth.uid() is null for service-role writes; that's fine.
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id::text;
    INSERT INTO public.audit_log (actor_id, action, table_name, row_id, before_data, after_data)
    VALUES (v_actor, 'DELETE', TG_TABLE_NAME, v_row_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_row_id := NEW.id::text;
    -- Skip no-op updates (sync loops can re-issue the same payload).
    IF to_jsonb(OLD) = to_jsonb(NEW) THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.audit_log (actor_id, action, table_name, row_id, before_data, after_data)
    VALUES (v_actor, 'UPDATE', TG_TABLE_NAME, v_row_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_row_id := NEW.id::text;
    INSERT INTO public.audit_log (actor_id, action, table_name, row_id, before_data, after_data)
    VALUES (v_actor, 'INSERT', TG_TABLE_NAME, v_row_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Attach to case_logs and procedure_logs ──────────────────────────────
-- Drop-then-create so this migration is re-runnable during development.
DROP TRIGGER IF EXISTS trg_audit_case_logs ON public.case_logs;
CREATE TRIGGER trg_audit_case_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.case_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row();

DROP TRIGGER IF EXISTS trg_audit_procedure_logs ON public.procedure_logs;
CREATE TRIGGER trg_audit_procedure_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.procedure_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row();
