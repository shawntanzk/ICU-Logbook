-- country_history: immutable audit trail of every country set/change on a profile.
-- The trigger below is the only writer; clients call update-country edge function.
-- To determine which country a user was associated with at the time of any log
-- entry, query: SELECT country FROM country_history
--               WHERE user_id = $1 AND changed_at <= $entry_created_at
--               ORDER BY changed_at DESC LIMIT 1

CREATE TABLE IF NOT EXISTS country_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country    CHAR(2)     NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS country_history_user_time
  ON country_history (user_id, changed_at DESC);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE country_history ENABLE ROW LEVEL SECURITY;

-- Users see only their own history; no direct inserts (trigger-only).
CREATE POLICY "Users view own country history"
  ON country_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all history rows (mirrors other admin policies in this schema).
CREATE POLICY "Admins view all country history"
  ON country_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Auto-record trigger ───────────────────────────────────────────────────────
-- Fires after INSERT (initial registration) and after UPDATE when country changes.
CREATE OR REPLACE FUNCTION record_country_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.country IS NOT NULL)
  OR (TG_OP = 'UPDATE' AND NEW.country IS DISTINCT FROM OLD.country AND NEW.country IS NOT NULL)
  THEN
    INSERT INTO country_history (user_id, country, changed_at)
    VALUES (NEW.id, NEW.country, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_country_change
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION record_country_change();

-- ── Backfill existing users ───────────────────────────────────────────────────
-- One history record per user who already has a country set, dated to when
-- their profile was created (best approximation of first-set time).
INSERT INTO country_history (user_id, country, changed_at)
SELECT id, country, created_at
FROM   profiles
WHERE  country IS NOT NULL;
