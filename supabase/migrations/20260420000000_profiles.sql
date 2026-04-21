-- profiles table — one row per auth user, auto-created by trigger.
--
-- Why a mirror of auth.users? Two reasons:
--   1. RLS policies and the app UI need columns that auth.users doesn't
--      expose (display_name, disabled flag, role mirrored for joins).
--   2. We want FK constraints from case_logs.owner_id → profiles.id so
--      deleting a user cascades their orphan references cleanly.

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  disabled     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_disabled ON public.profiles (disabled);

-- Trigger: auto-create a profiles row whenever a new auth.users row
-- appears. Reads display_name from user_metadata (set by signUp), and
-- role from app_metadata (admin-only; default user).
CREATE OR REPLACE FUNCTION public.fn_profiles_on_auth_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_on_auth_insert ON auth.users;
CREATE TRIGGER trg_profiles_on_auth_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_on_auth_insert();

-- Keep profiles.email in sync if the user changes it via auth.
CREATE OR REPLACE FUNCTION public.fn_profiles_on_auth_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_on_auth_update ON auth.users;
CREATE TRIGGER trg_profiles_on_auth_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_on_auth_update();

-- Back-fill any auth.users rows that predate this migration.
INSERT INTO public.profiles (id, email, display_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_app_meta_data ->> 'role', 'user')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ─── RLS on profiles ────────────────────────────────────────────────
-- Anyone authenticated can read the directory (needed to resolve
-- supervisor/observer display names). Users can update only their own
-- display_name. Role and disabled flips go through admin code paths.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Users cannot self-promote or re-enable a disabled account.
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND disabled = (SELECT disabled FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
