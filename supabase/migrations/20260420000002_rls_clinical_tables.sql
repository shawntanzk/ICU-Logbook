-- Row-Level Security for clinical tables.
--
-- Visibility rules (match src/services/AuthScope.ts):
--   * owner of the row
--   * tagged supervisor_user_id
--   * tagged observer_user_id
--   * admins (app_metadata.role = 'admin')
-- Disabled users see nothing — enforced by joining profiles.disabled.
--
-- Mutation rules:
--   INSERT: any authenticated, non-disabled user, but only as themselves
--           (owner_id must equal auth.uid()). Admins may insert for
--           anyone (data import, migration).
--   UPDATE: owner or admin freely. Supervisors may update only the
--           approval columns of a row they supervise — enforced by an
--           additional trigger below because RLS can't gate per-column
--           without SECURITY INVOKER gymnastics.
--   DELETE: owner or admin only. (Soft-delete via deleted_at is the
--           expected path; hard-delete is rare.)

-- Helper: is the current JWT an admin?
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Helper: is the current user non-disabled? (A disabled profile cannot
-- read or write anything — belt-and-braces check on every policy.)
CREATE OR REPLACE FUNCTION public.fn_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT coalesce((SELECT disabled FROM public.profiles WHERE id = auth.uid()), true);
$$;

-- ─── case_logs ──────────────────────────────────────────────────────
ALTER TABLE public.case_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_logs_select ON public.case_logs;
CREATE POLICY case_logs_select ON public.case_logs
  FOR SELECT
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
      OR observer_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS case_logs_insert ON public.case_logs;
CREATE POLICY case_logs_insert ON public.case_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS case_logs_update ON public.case_logs;
CREATE POLICY case_logs_update ON public.case_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS case_logs_delete ON public.case_logs;
CREATE POLICY case_logs_delete ON public.case_logs
  FOR DELETE
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

-- Supervisors can only touch approval columns. Any other column change
-- by a non-owner non-admin is rolled back at the trigger.
CREATE OR REPLACE FUNCTION public.fn_guard_case_supervisor_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;

  -- Remaining case: supervisor. Only approval bookkeeping may change.
  IF
    NEW.diagnosis           IS DISTINCT FROM OLD.diagnosis
    OR NEW.icd10_code       IS DISTINCT FROM OLD.icd10_code
    OR NEW.organ_systems    IS DISTINCT FROM OLD.organ_systems
    OR NEW.cobatrice_domains IS DISTINCT FROM OLD.cobatrice_domains
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.reflection       IS DISTINCT FROM OLD.reflection
    OR NEW.owner_id         IS DISTINCT FROM OLD.owner_id
    OR NEW.date             IS DISTINCT FROM OLD.date
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_case_supervisor ON public.case_logs;
CREATE TRIGGER trg_guard_case_supervisor
  BEFORE UPDATE ON public.case_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_case_supervisor_edits();

-- ─── procedure_logs ─────────────────────────────────────────────────
ALTER TABLE public.procedure_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procedure_logs_select ON public.procedure_logs;
CREATE POLICY procedure_logs_select ON public.procedure_logs
  FOR SELECT
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
      OR observer_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS procedure_logs_insert ON public.procedure_logs;
CREATE POLICY procedure_logs_insert ON public.procedure_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS procedure_logs_update ON public.procedure_logs;
CREATE POLICY procedure_logs_update ON public.procedure_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS procedure_logs_delete ON public.procedure_logs;
CREATE POLICY procedure_logs_delete ON public.procedure_logs
  FOR DELETE
  TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_procedure_supervisor_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;

  IF
    NEW.procedure_type   IS DISTINCT FROM OLD.procedure_type
    OR NEW.attempts      IS DISTINCT FROM OLD.attempts
    OR NEW.success       IS DISTINCT FROM OLD.success
    OR NEW.complications IS DISTINCT FROM OLD.complications
    OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
    OR NEW.case_id       IS DISTINCT FROM OLD.case_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_procedure_supervisor ON public.procedure_logs;
CREATE TRIGGER trg_guard_procedure_supervisor
  BEFORE UPDATE ON public.procedure_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_procedure_supervisor_edits();
