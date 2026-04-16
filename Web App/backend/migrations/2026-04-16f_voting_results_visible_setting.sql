-- 2026-04-16f — Add voting_results_visible setting (default "false")
--
-- New admin toggle on the Projects page hides vote tallies from delegates
-- until flipped. Idempotent — ON DUPLICATE KEY UPDATE preserves any
-- existing admin choice if the setting row already exists.
--
-- Apply on VPS:
--   cd "/opt/fica/Web App/backend"
--   set -a; source .env; set +a
--   mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
--         -h "$DATABASE_HOST" -P "$DATABASE_PORT" \
--         "$DATABASE_NAME" \
--         < migrations/2026-04-16f_voting_results_visible_setting.sql

START TRANSACTION;

INSERT INTO event_settings (setting_key, setting_value)
VALUES ('voting_results_visible', 'false')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

COMMIT;

-- Verify — should show both voting flags.
SELECT setting_key, setting_value, updated_at
  FROM event_settings
 WHERE setting_key IN ('voting_open', 'voting_results_visible');
