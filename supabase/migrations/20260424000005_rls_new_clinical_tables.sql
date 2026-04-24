-- RLS + supervisor-guard triggers for the 9 new clinical tables.
--
-- Visibility rules (identical to case_logs / procedure_logs):
--   SELECT : owner | supervisor_user_id | admin, non-disabled only
--   INSERT : owner or admin, owner_id must equal auth.uid()
--   UPDATE : owner or supervisor (approval columns only) or admin
--   DELETE : owner or admin (soft-delete via deleted_at preferred)
--
-- Each table gets:
--   1. Four RLS policies (select / insert / update / delete)
--   2. A BEFORE UPDATE trigger that prevents supervisors from
--      touching clinical content (only approval columns allowed).
--
-- fn_is_admin() and fn_is_active() are defined in migration 000002.

-- ── Helper: build RLS policies for a given table ─────────────────────────
-- (Postgres doesn't support parameterised DDL, so we repeat the pattern
--  for each table — kept readable by putting all four policies together.)

-- ════════════════════════════════════════════════════════════════════════
-- airway_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.airway_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS airway_logs_select ON public.airway_logs;
CREATE POLICY airway_logs_select ON public.airway_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS airway_logs_insert ON public.airway_logs;
CREATE POLICY airway_logs_insert ON public.airway_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS airway_logs_update ON public.airway_logs;
CREATE POLICY airway_logs_update ON public.airway_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS airway_logs_delete ON public.airway_logs;
CREATE POLICY airway_logs_delete ON public.airway_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_airway_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date                      IS DISTINCT FROM OLD.date
    OR NEW.is_rsi                 IS DISTINCT FROM OLD.is_rsi
    OR NEW.induction_agent        IS DISTINCT FROM OLD.induction_agent
    OR NEW.neuromuscular_agent    IS DISTINCT FROM OLD.neuromuscular_agent
    OR NEW.device                 IS DISTINCT FROM OLD.device
    OR NEW.tube_size              IS DISTINCT FROM OLD.tube_size
    OR NEW.tube_type              IS DISTINCT FROM OLD.tube_type
    OR NEW.attempts               IS DISTINCT FROM OLD.attempts
    OR NEW.success                IS DISTINCT FROM OLD.success
    OR NEW.cormack_lehane_grade   IS DISTINCT FROM OLD.cormack_lehane_grade
    OR NEW.dae_used               IS DISTINCT FROM OLD.dae_used
    OR NEW.dae_items              IS DISTINCT FROM OLD.dae_items
    OR NEW.supervision_level      IS DISTINCT FROM OLD.supervision_level
    OR NEW.notes                  IS DISTINCT FROM OLD.notes
    OR NEW.owner_id               IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_airway_supervisor ON public.airway_logs;
CREATE TRIGGER trg_guard_airway_supervisor
  BEFORE UPDATE ON public.airway_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_airway_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- arterial_line_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.arterial_line_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arterial_line_logs_select ON public.arterial_line_logs;
CREATE POLICY arterial_line_logs_select ON public.arterial_line_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS arterial_line_logs_insert ON public.arterial_line_logs;
CREATE POLICY arterial_line_logs_insert ON public.arterial_line_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS arterial_line_logs_update ON public.arterial_line_logs;
CREATE POLICY arterial_line_logs_update ON public.arterial_line_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS arterial_line_logs_delete ON public.arterial_line_logs;
CREATE POLICY arterial_line_logs_delete ON public.arterial_line_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_arterial_line_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date               IS DISTINCT FROM OLD.date
    OR NEW.site            IS DISTINCT FROM OLD.site
    OR NEW.uss_guided      IS DISTINCT FROM OLD.uss_guided
    OR NEW.attempts        IS DISTINCT FROM OLD.attempts
    OR NEW.success         IS DISTINCT FROM OLD.success
    OR NEW.complications   IS DISTINCT FROM OLD.complications
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id        IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_arterial_line_supervisor ON public.arterial_line_logs;
CREATE TRIGGER trg_guard_arterial_line_supervisor
  BEFORE UPDATE ON public.arterial_line_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_arterial_line_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- cvc_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cvc_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cvc_logs_select ON public.cvc_logs;
CREATE POLICY cvc_logs_select ON public.cvc_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS cvc_logs_insert ON public.cvc_logs;
CREATE POLICY cvc_logs_insert ON public.cvc_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS cvc_logs_update ON public.cvc_logs;
CREATE POLICY cvc_logs_update ON public.cvc_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS cvc_logs_delete ON public.cvc_logs;
CREATE POLICY cvc_logs_delete ON public.cvc_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_cvc_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date             IS DISTINCT FROM OLD.date
    OR NEW.site          IS DISTINCT FROM OLD.site
    OR NEW.is_second_cvc IS DISTINCT FROM OLD.is_second_cvc
    OR NEW.is_vascath    IS DISTINCT FROM OLD.is_vascath
    OR NEW.uss_guided    IS DISTINCT FROM OLD.uss_guided
    OR NEW.attempts      IS DISTINCT FROM OLD.attempts
    OR NEW.success       IS DISTINCT FROM OLD.success
    OR NEW.complications IS DISTINCT FROM OLD.complications
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_cvc_supervisor ON public.cvc_logs;
CREATE TRIGGER trg_guard_cvc_supervisor
  BEFORE UPDATE ON public.cvc_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_cvc_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- uss_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.uss_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uss_logs_select ON public.uss_logs;
CREATE POLICY uss_logs_select ON public.uss_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS uss_logs_insert ON public.uss_logs;
CREATE POLICY uss_logs_insert ON public.uss_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS uss_logs_update ON public.uss_logs;
CREATE POLICY uss_logs_update ON public.uss_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS uss_logs_delete ON public.uss_logs;
CREATE POLICY uss_logs_delete ON public.uss_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_uss_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date             IS DISTINCT FROM OLD.date
    OR NEW.study_type    IS DISTINCT FROM OLD.study_type
    OR NEW.performed     IS DISTINCT FROM OLD.performed
    OR NEW.formal_report IS DISTINCT FROM OLD.formal_report
    OR NEW.findings      IS DISTINCT FROM OLD.findings
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_uss_supervisor ON public.uss_logs;
CREATE TRIGGER trg_guard_uss_supervisor
  BEFORE UPDATE ON public.uss_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_uss_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- regional_block_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.regional_block_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regional_block_logs_select ON public.regional_block_logs;
CREATE POLICY regional_block_logs_select ON public.regional_block_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS regional_block_logs_insert ON public.regional_block_logs;
CREATE POLICY regional_block_logs_insert ON public.regional_block_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS regional_block_logs_update ON public.regional_block_logs;
CREATE POLICY regional_block_logs_update ON public.regional_block_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS regional_block_logs_delete ON public.regional_block_logs;
CREATE POLICY regional_block_logs_delete ON public.regional_block_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_regional_block_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date             IS DISTINCT FROM OLD.date
    OR NEW.block_type    IS DISTINCT FROM OLD.block_type
    OR NEW.uss_guided    IS DISTINCT FROM OLD.uss_guided
    OR NEW.catheter      IS DISTINCT FROM OLD.catheter
    OR NEW.attempts      IS DISTINCT FROM OLD.attempts
    OR NEW.success       IS DISTINCT FROM OLD.success
    OR NEW.complications IS DISTINCT FROM OLD.complications
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id      IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_regional_block_supervisor ON public.regional_block_logs;
CREATE TRIGGER trg_guard_regional_block_supervisor
  BEFORE UPDATE ON public.regional_block_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_regional_block_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- ward_review_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ward_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ward_review_logs_select ON public.ward_review_logs;
CREATE POLICY ward_review_logs_select ON public.ward_review_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS ward_review_logs_insert ON public.ward_review_logs;
CREATE POLICY ward_review_logs_insert ON public.ward_review_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS ward_review_logs_update ON public.ward_review_logs;
CREATE POLICY ward_review_logs_update ON public.ward_review_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS ward_review_logs_delete ON public.ward_review_logs;
CREATE POLICY ward_review_logs_delete ON public.ward_review_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_ward_review_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date                         IS DISTINCT FROM OLD.date
    OR NEW.diagnosis                 IS DISTINCT FROM OLD.diagnosis
    OR NEW.icd10_code                IS DISTINCT FROM OLD.icd10_code
    OR NEW.review_outcome            IS DISTINCT FROM OLD.review_outcome
    OR NEW.communicated_with_relatives IS DISTINCT FROM OLD.communicated_with_relatives
    OR NEW.cobatrice_domains         IS DISTINCT FROM OLD.cobatrice_domains
    OR NEW.reflection                IS DISTINCT FROM OLD.reflection
    OR NEW.supervision_level         IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id                  IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ward_review_supervisor ON public.ward_review_logs;
CREATE TRIGGER trg_guard_ward_review_supervisor
  BEFORE UPDATE ON public.ward_review_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_ward_review_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- transfer_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.transfer_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transfer_logs_select ON public.transfer_logs;
CREATE POLICY transfer_logs_select ON public.transfer_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS transfer_logs_insert ON public.transfer_logs;
CREATE POLICY transfer_logs_insert ON public.transfer_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS transfer_logs_update ON public.transfer_logs;
CREATE POLICY transfer_logs_update ON public.transfer_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS transfer_logs_delete ON public.transfer_logs;
CREATE POLICY transfer_logs_delete ON public.transfer_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_transfer_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date                         IS DISTINCT FROM OLD.date
    OR NEW.diagnosis                 IS DISTINCT FROM OLD.diagnosis
    OR NEW.icd10_code                IS DISTINCT FROM OLD.icd10_code
    OR NEW.transfer_type             IS DISTINCT FROM OLD.transfer_type
    OR NEW.transfer_mode             IS DISTINCT FROM OLD.transfer_mode
    OR NEW.from_location             IS DISTINCT FROM OLD.from_location
    OR NEW.to_location               IS DISTINCT FROM OLD.to_location
    OR NEW.level_of_care             IS DISTINCT FROM OLD.level_of_care
    OR NEW.procedures_during_transfer IS DISTINCT FROM OLD.procedures_during_transfer
    OR NEW.communicated_with_relatives IS DISTINCT FROM OLD.communicated_with_relatives
    OR NEW.reflection                IS DISTINCT FROM OLD.reflection
    OR NEW.supervision_level         IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id                  IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_transfer_supervisor ON public.transfer_logs;
CREATE TRIGGER trg_guard_transfer_supervisor
  BEFORE UPDATE ON public.transfer_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_transfer_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- ed_attendance_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ed_attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ed_attendance_logs_select ON public.ed_attendance_logs;
CREATE POLICY ed_attendance_logs_select ON public.ed_attendance_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS ed_attendance_logs_insert ON public.ed_attendance_logs;
CREATE POLICY ed_attendance_logs_insert ON public.ed_attendance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS ed_attendance_logs_update ON public.ed_attendance_logs;
CREATE POLICY ed_attendance_logs_update ON public.ed_attendance_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS ed_attendance_logs_delete ON public.ed_attendance_logs;
CREATE POLICY ed_attendance_logs_delete ON public.ed_attendance_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_ed_attendance_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.date                          IS DISTINCT FROM OLD.date
    OR NEW.diagnosis                  IS DISTINCT FROM OLD.diagnosis
    OR NEW.icd10_code                 IS DISTINCT FROM OLD.icd10_code
    OR NEW.icu_admission              IS DISTINCT FROM OLD.icu_admission
    OR NEW.presenting_category        IS DISTINCT FROM OLD.presenting_category
    OR NEW.cardiac_arrest             IS DISTINCT FROM OLD.cardiac_arrest
    OR NEW.communicated_with_relatives IS DISTINCT FROM OLD.communicated_with_relatives
    OR NEW.cobatrice_domains          IS DISTINCT FROM OLD.cobatrice_domains
    OR NEW.reflection                 IS DISTINCT FROM OLD.reflection
    OR NEW.supervision_level          IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id                   IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ed_attendance_supervisor ON public.ed_attendance_logs;
CREATE TRIGGER trg_guard_ed_attendance_supervisor
  BEFORE UPDATE ON public.ed_attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_ed_attendance_supervisor_edits();

-- ════════════════════════════════════════════════════════════════════════
-- medicine_placement_logs
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.medicine_placement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medicine_placement_logs_select ON public.medicine_placement_logs;
CREATE POLICY medicine_placement_logs_select ON public.medicine_placement_logs
  FOR SELECT TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
      OR supervisor_user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS medicine_placement_logs_insert ON public.medicine_placement_logs;
CREATE POLICY medicine_placement_logs_insert ON public.medicine_placement_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS medicine_placement_logs_update ON public.medicine_placement_logs;
CREATE POLICY medicine_placement_logs_update ON public.medicine_placement_logs
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS medicine_placement_logs_delete ON public.medicine_placement_logs;
CREATE POLICY medicine_placement_logs_delete ON public.medicine_placement_logs
  FOR DELETE TO authenticated
  USING (
    public.fn_is_active() AND (
      public.fn_is_admin()
      OR owner_id::text = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.fn_guard_medicine_placement_supervisor_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;
  IF
    NEW.start_date          IS DISTINCT FROM OLD.start_date
    OR NEW.end_date         IS DISTINCT FROM OLD.end_date
    OR NEW.specialty        IS DISTINCT FROM OLD.specialty
    OR NEW.hospital         IS DISTINCT FROM OLD.hospital
    OR NEW.ward             IS DISTINCT FROM OLD.ward
    OR NEW.patient_count    IS DISTINCT FROM OLD.patient_count
    OR NEW.teaching_delivered IS DISTINCT FROM OLD.teaching_delivered
    OR NEW.teaching_recipient IS DISTINCT FROM OLD.teaching_recipient
    OR NEW.cobatrice_domains IS DISTINCT FROM OLD.cobatrice_domains
    OR NEW.reflection       IS DISTINCT FROM OLD.reflection
    OR NEW.supervision_level IS DISTINCT FROM OLD.supervision_level
    OR NEW.owner_id         IS DISTINCT FROM OLD.owner_id
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_medicine_placement_supervisor ON public.medicine_placement_logs;
CREATE TRIGGER trg_guard_medicine_placement_supervisor
  BEFORE UPDATE ON public.medicine_placement_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_medicine_placement_supervisor_edits();
