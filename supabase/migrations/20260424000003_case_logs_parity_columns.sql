-- v9 parity columns for case_logs — mirrors SQLite migration v9.
--
-- Adds patient demographics, episode classification, outcome, teaching,
-- and expanded semantic-layer columns.  All nullable / DEFAULT-safe so
-- existing rows continue to work with no backfill.
--
-- Supervision values: old 3-level values (observed / supervised /
-- unsupervised) are kept; the service layer maps them on read.

-- ── Patient demographics (no PII — age string only, no DOB) ──────────
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS patient_age TEXT;           -- '45' | '2/12' | '1/52'

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS patient_sex TEXT;           -- M / F / Other / Unknown

-- ── Episode classification ─────────────────────────────────────────────
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS case_number TEXT;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS primary_specialty TEXT;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS level_of_care TEXT;         -- '1' | '2' | '3'

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS admitted BOOLEAN;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS cardiac_arrest BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS involvement TEXT;           -- major | minor | procedure_only

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS reviewed_again BOOLEAN NOT NULL DEFAULT false;

-- ── Outcome / communication ────────────────────────────────────────────
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS outcome TEXT;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS communicated_with_relatives BOOLEAN NOT NULL DEFAULT false;

-- ── Teaching ───────────────────────────────────────────────────────────
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS teaching_delivered BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS teaching_recipient TEXT;

-- ── Expanded semantic layer (JSONB CodedValue) ─────────────────────────
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS specialty_coded JSONB;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS level_of_care_coded JSONB;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS outcome_coded JSONB;

-- ── Indices ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_case_logs_specialty
  ON public.case_logs (primary_specialty);

CREATE INDEX IF NOT EXISTS idx_case_logs_level
  ON public.case_logs (level_of_care);

CREATE INDEX IF NOT EXISTS idx_case_logs_outcome
  ON public.case_logs (outcome);

CREATE INDEX IF NOT EXISTS idx_case_logs_date
  ON public.case_logs (date);

-- ── Supervisor guard: extend to protect new clinical columns ───────────
-- The guard function is replaced (CREATE OR REPLACE) so it picks up
-- the additional columns that supervisors must not be able to change.

CREATE OR REPLACE FUNCTION public.fn_guard_case_supervisor_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fn_is_admin() THEN RETURN NEW; END IF;
  IF OLD.owner_id::text = auth.uid()::text THEN RETURN NEW; END IF;

  -- Remaining case: supervisor.  Only approval bookkeeping may change.
  IF
    NEW.diagnosis                    IS DISTINCT FROM OLD.diagnosis
    OR NEW.icd10_code                IS DISTINCT FROM OLD.icd10_code
    OR NEW.organ_systems             IS DISTINCT FROM OLD.organ_systems
    OR NEW.cobatrice_domains         IS DISTINCT FROM OLD.cobatrice_domains
    OR NEW.supervision_level         IS DISTINCT FROM OLD.supervision_level
    OR NEW.reflection                IS DISTINCT FROM OLD.reflection
    OR NEW.owner_id                  IS DISTINCT FROM OLD.owner_id
    OR NEW.date                      IS DISTINCT FROM OLD.date
    -- v9 columns
    OR NEW.patient_age               IS DISTINCT FROM OLD.patient_age
    OR NEW.patient_sex               IS DISTINCT FROM OLD.patient_sex
    OR NEW.case_number               IS DISTINCT FROM OLD.case_number
    OR NEW.primary_specialty         IS DISTINCT FROM OLD.primary_specialty
    OR NEW.level_of_care             IS DISTINCT FROM OLD.level_of_care
    OR NEW.admitted                  IS DISTINCT FROM OLD.admitted
    OR NEW.cardiac_arrest            IS DISTINCT FROM OLD.cardiac_arrest
    OR NEW.involvement               IS DISTINCT FROM OLD.involvement
    OR NEW.reviewed_again            IS DISTINCT FROM OLD.reviewed_again
    OR NEW.outcome                   IS DISTINCT FROM OLD.outcome
    OR NEW.communicated_with_relatives IS DISTINCT FROM OLD.communicated_with_relatives
    OR NEW.teaching_delivered        IS DISTINCT FROM OLD.teaching_delivered
    OR NEW.teaching_recipient        IS DISTINCT FROM OLD.teaching_recipient
  THEN
    RAISE EXCEPTION 'guard_approval: supervisors may only set approval columns'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
