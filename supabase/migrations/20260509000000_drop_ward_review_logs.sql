-- Remove ward_review_logs table and all associated objects.
-- Ward Review feature has been removed from the application.
-- Conditional block handles environments that never applied the creation migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ward_review_logs'
  ) THEN
    DROP TRIGGER IF EXISTS trg_guard_ward_review_supervisor ON public.ward_review_logs;
    DROP TABLE public.ward_review_logs CASCADE;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.fn_guard_ward_review_supervisor_edits();
