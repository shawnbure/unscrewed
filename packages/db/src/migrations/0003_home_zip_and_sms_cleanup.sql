-- Drop SMS residue + add home location fields to users
--
-- We removed the SMS auth flow; the tables were only holding audit
-- history at this point. Drop them cleanly rather than leaving dead
-- data around.
--
-- Users get three new fields for the /community map:
--   home_zip  — 5-digit US ZIP the user provided at signup or from /account
--   home_lat / home_lng — server-side geocode from home_zip, used only in
--                          aggregate form for the public heatmap. Never
--                          exposed per-user through public endpoints.

DROP TABLE IF EXISTS sms_codes;
DROP TABLE IF EXISTS sms_log;

ALTER TABLE users ADD COLUMN home_zip  text;
ALTER TABLE users ADD COLUMN home_lat  real;
ALTER TABLE users ADD COLUMN home_lng  real;

-- Aggregate map queries group by the first 3 digits of the ZIP.
CREATE INDEX IF NOT EXISTS ix_users_home_zip3
  ON users (substr(home_zip, 1, 3))
  WHERE home_zip IS NOT NULL;
