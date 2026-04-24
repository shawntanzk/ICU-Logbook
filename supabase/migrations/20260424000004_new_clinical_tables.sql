-- v10 — new sub-entity tables: mirrors SQLite migration v10.
--
-- Creates 9 tables that capture procedure subtypes and clinical episode
-- subtypes.  All follow the same governance pattern as case_logs:
--   owner_id, supervisor_user_id, approved_by/at,
--   synced / conflict / deleted_at / server_updated_at,
--   sync_retry_count / sync_last_error,
--   schema_version, provenance (JSONB), quality (JSONB),
--   consent_status, license.
--
-- Coded columns (JSONB) hold CodedValue objects from the app's
-- OBO-aligned terminology layer; kept nullable so rows inserted by
-- older app versions remain valid.
--
-- All tables FK-reference case_logs.id with ON DELETE SET NULL so that
-- deleting a case orphans rather than cascades procedure records
-- (consistent with the mobile SQLite schema).

-- ── airway_logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.airway_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.case_logs(id) ON DELETE SET NULL,
  date                      DATE NOT NULL,
  is_rsi                    BOOLEAN NOT NULL DEFAULT false,
  induction_agent           TEXT,
  induction_agent_other     TEXT,
  neuromuscular_agent       TEXT,
  neuromuscular_agent_other TEXT,
  device                    TEXT,
  tube_size                 NUMERIC(4,1),
  tube_type                 TEXT,                   -- 'oral' | 'nasal'
  attempts                  SMALLINT NOT NULL DEFAULT 1,
  success                   BOOLEAN NOT NULL DEFAULT true,
  cormack_lehane_grade      TEXT,                   -- '1' | '2a' | '2b' | '3a' | '3b' | '4'
  dae_used                  BOOLEAN NOT NULL DEFAULT false,
  dae_items                 JSONB NOT NULL DEFAULT '[]',
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  notes                     TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  device_coded              JSONB,
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_airway_logs_case    ON public.airway_logs (case_id);
CREATE INDEX IF NOT EXISTS idx_airway_logs_owner   ON public.airway_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_airway_logs_date    ON public.airway_logs (date);
CREATE INDEX IF NOT EXISTS idx_airway_logs_sync    ON public.airway_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_airway_logs_supervisor ON public.airway_logs (supervisor_user_id);

-- ── arterial_line_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arterial_line_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.case_logs(id) ON DELETE SET NULL,
  date                      DATE NOT NULL,
  site                      TEXT NOT NULL,
  uss_guided                BOOLEAN NOT NULL DEFAULT false,
  attempts                  SMALLINT NOT NULL DEFAULT 1,
  success                   BOOLEAN NOT NULL DEFAULT true,
  complications             TEXT,
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  site_coded                JSONB,
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_case    ON public.arterial_line_logs (case_id);
CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_owner   ON public.arterial_line_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_date    ON public.arterial_line_logs (date);
CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_sync    ON public.arterial_line_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_arterial_line_logs_supervisor ON public.arterial_line_logs (supervisor_user_id);

-- ── cvc_logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cvc_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.case_logs(id) ON DELETE SET NULL,
  date                      DATE NOT NULL,
  site                      TEXT NOT NULL,
  is_second_cvc             BOOLEAN NOT NULL DEFAULT false,
  is_vascath                BOOLEAN NOT NULL DEFAULT false,
  uss_guided                BOOLEAN NOT NULL DEFAULT false,
  attempts                  SMALLINT NOT NULL DEFAULT 1,
  success                   BOOLEAN NOT NULL DEFAULT true,
  complications             TEXT,
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  site_coded                JSONB,
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_cvc_logs_case       ON public.cvc_logs (case_id);
CREATE INDEX IF NOT EXISTS idx_cvc_logs_owner      ON public.cvc_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_cvc_logs_date       ON public.cvc_logs (date);
CREATE INDEX IF NOT EXISTS idx_cvc_logs_sync       ON public.cvc_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_cvc_logs_supervisor ON public.cvc_logs (supervisor_user_id);

-- ── uss_logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uss_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.case_logs(id) ON DELETE SET NULL,
  date                      DATE NOT NULL,
  study_type                TEXT NOT NULL,
  performed                 BOOLEAN NOT NULL DEFAULT true,
  formal_report             BOOLEAN NOT NULL DEFAULT false,
  findings                  TEXT,
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  study_type_coded          JSONB,
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_uss_logs_case        ON public.uss_logs (case_id);
CREATE INDEX IF NOT EXISTS idx_uss_logs_owner       ON public.uss_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_uss_logs_date        ON public.uss_logs (date);
CREATE INDEX IF NOT EXISTS idx_uss_logs_sync        ON public.uss_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_uss_logs_study_type  ON public.uss_logs (study_type);
CREATE INDEX IF NOT EXISTS idx_uss_logs_supervisor  ON public.uss_logs (supervisor_user_id);

-- ── regional_block_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regional_block_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.case_logs(id) ON DELETE SET NULL,
  date                      DATE NOT NULL,
  block_type                TEXT NOT NULL,
  block_type_other          TEXT,
  uss_guided                BOOLEAN NOT NULL DEFAULT true,
  catheter                  BOOLEAN NOT NULL DEFAULT false,
  attempts                  SMALLINT NOT NULL DEFAULT 1,
  success                   BOOLEAN NOT NULL DEFAULT true,
  complications             TEXT,
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  block_type_coded          JSONB,
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_regional_block_logs_case        ON public.regional_block_logs (case_id);
CREATE INDEX IF NOT EXISTS idx_regional_block_logs_owner       ON public.regional_block_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_regional_block_logs_date        ON public.regional_block_logs (date);
CREATE INDEX IF NOT EXISTS idx_regional_block_logs_sync        ON public.regional_block_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_regional_block_logs_block_type  ON public.regional_block_logs (block_type);
CREATE INDEX IF NOT EXISTS idx_regional_block_logs_supervisor  ON public.regional_block_logs (supervisor_user_id);

-- ── ward_review_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ward_review_logs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                        DATE NOT NULL,
  patient_age                 TEXT,
  patient_sex                 TEXT,
  referring_specialty         TEXT,
  diagnosis                   TEXT NOT NULL,
  icd10_code                  TEXT NOT NULL DEFAULT '',
  review_outcome              TEXT NOT NULL DEFAULT 'advice_only',
  communicated_with_relatives BOOLEAN NOT NULL DEFAULT false,
  cobatrice_domains           JSONB NOT NULL DEFAULT '[]',
  reflection                  TEXT,
  supervision_level           TEXT NOT NULL,
  supervisor_user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name    TEXT,
  -- governance
  owner_id                    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                      BOOLEAN NOT NULL DEFAULT false,
  conflict                    BOOLEAN NOT NULL DEFAULT false,
  deleted_at                  TIMESTAMPTZ,
  server_updated_at           TIMESTAMPTZ,
  sync_retry_count            SMALLINT NOT NULL DEFAULT 0,
  sync_last_error             TEXT,
  -- semantic
  schema_version              TEXT NOT NULL DEFAULT '3.0.0',
  diagnosis_coded             JSONB,
  cobatrice_domains_coded     JSONB NOT NULL DEFAULT '[]',
  supervision_level_coded     JSONB,
  provenance                  JSONB,
  quality                     JSONB,
  consent_status              TEXT NOT NULL DEFAULT 'anonymous',
  license                     TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_ward_review_logs_owner       ON public.ward_review_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_ward_review_logs_date        ON public.ward_review_logs (date);
CREATE INDEX IF NOT EXISTS idx_ward_review_logs_sync        ON public.ward_review_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_ward_review_logs_supervisor  ON public.ward_review_logs (supervisor_user_id);

-- ── transfer_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transfer_logs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                        DATE NOT NULL,
  patient_age                 TEXT,
  patient_sex                 TEXT,
  diagnosis                   TEXT NOT NULL,
  icd10_code                  TEXT NOT NULL DEFAULT '',
  transfer_type               TEXT NOT NULL DEFAULT 'inter_hospital',
  transfer_mode               TEXT NOT NULL DEFAULT 'land_ambulance',
  from_location               TEXT,
  to_location                 TEXT,
  level_of_care               TEXT,
  procedures_during_transfer  JSONB NOT NULL DEFAULT '[]',
  communicated_with_relatives BOOLEAN NOT NULL DEFAULT false,
  reflection                  TEXT,
  supervision_level           TEXT NOT NULL,
  supervisor_user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name    TEXT,
  -- governance
  owner_id                    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                      BOOLEAN NOT NULL DEFAULT false,
  conflict                    BOOLEAN NOT NULL DEFAULT false,
  deleted_at                  TIMESTAMPTZ,
  server_updated_at           TIMESTAMPTZ,
  sync_retry_count            SMALLINT NOT NULL DEFAULT 0,
  sync_last_error             TEXT,
  -- semantic
  schema_version              TEXT NOT NULL DEFAULT '3.0.0',
  diagnosis_coded             JSONB,
  supervision_level_coded     JSONB,
  provenance                  JSONB,
  quality                     JSONB,
  consent_status              TEXT NOT NULL DEFAULT 'anonymous',
  license                     TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_transfer_logs_owner      ON public.transfer_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_date       ON public.transfer_logs (date);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_sync       ON public.transfer_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_supervisor ON public.transfer_logs (supervisor_user_id);

-- ── ed_attendance_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ed_attendance_logs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                        DATE NOT NULL,
  patient_age                 TEXT,
  patient_sex                 TEXT,
  diagnosis                   TEXT NOT NULL,
  icd10_code                  TEXT NOT NULL DEFAULT '',
  icu_admission               BOOLEAN NOT NULL DEFAULT false,
  presenting_category         TEXT,
  cardiac_arrest              BOOLEAN NOT NULL DEFAULT false,
  communicated_with_relatives BOOLEAN NOT NULL DEFAULT false,
  cobatrice_domains           JSONB NOT NULL DEFAULT '[]',
  reflection                  TEXT,
  supervision_level           TEXT NOT NULL,
  supervisor_user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name    TEXT,
  -- governance
  owner_id                    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                      BOOLEAN NOT NULL DEFAULT false,
  conflict                    BOOLEAN NOT NULL DEFAULT false,
  deleted_at                  TIMESTAMPTZ,
  server_updated_at           TIMESTAMPTZ,
  sync_retry_count            SMALLINT NOT NULL DEFAULT 0,
  sync_last_error             TEXT,
  -- semantic
  schema_version              TEXT NOT NULL DEFAULT '3.0.0',
  diagnosis_coded             JSONB,
  cobatrice_domains_coded     JSONB NOT NULL DEFAULT '[]',
  supervision_level_coded     JSONB,
  provenance                  JSONB,
  quality                     JSONB,
  consent_status              TEXT NOT NULL DEFAULT 'anonymous',
  license                     TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_owner      ON public.ed_attendance_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_date       ON public.ed_attendance_logs (date);
CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_sync       ON public.ed_attendance_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_ed_attendance_logs_supervisor ON public.ed_attendance_logs (supervisor_user_id);

-- ── medicine_placement_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicine_placement_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date                DATE NOT NULL,
  end_date                  DATE,
  specialty                 TEXT NOT NULL,
  hospital                  TEXT,
  ward                      TEXT,
  patient_count             INTEGER,
  teaching_delivered        BOOLEAN NOT NULL DEFAULT false,
  teaching_recipient        TEXT,
  cobatrice_domains         JSONB NOT NULL DEFAULT '[]',
  reflection                TEXT,
  supervision_level         TEXT NOT NULL,
  supervisor_user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_supervisor_name  TEXT,
  -- governance
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced                    BOOLEAN NOT NULL DEFAULT false,
  conflict                  BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  server_updated_at         TIMESTAMPTZ,
  sync_retry_count          SMALLINT NOT NULL DEFAULT 0,
  sync_last_error           TEXT,
  -- semantic
  schema_version            TEXT NOT NULL DEFAULT '3.0.0',
  specialty_coded           JSONB,
  cobatrice_domains_coded   JSONB NOT NULL DEFAULT '[]',
  supervision_level_coded   JSONB,
  provenance                JSONB,
  quality                   JSONB,
  consent_status            TEXT NOT NULL DEFAULT 'anonymous',
  license                   TEXT NOT NULL DEFAULT 'CC-BY-NC-4.0'
);

CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_owner      ON public.medicine_placement_logs (owner_id);
CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_date       ON public.medicine_placement_logs (start_date);
CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_sync       ON public.medicine_placement_logs (synced, conflict);
CREATE INDEX IF NOT EXISTS idx_medicine_placement_logs_supervisor ON public.medicine_placement_logs (supervisor_user_id);
