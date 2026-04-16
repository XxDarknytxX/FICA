-- 2026-04-16c — Panel Discussion feature (schema + settings toggle)
--
-- Creates the two tables the new delegate Panels tab and admin panel-
-- member picker depend on, and seeds the panel_discussion_enabled setting
-- so the mobile composer is enabled by default on first rollout.
--
-- Idempotent — safe to re-run. Wrapped in a transaction so if any part
-- fails nothing is left half-applied.
--
-- Apply on VPS:
--   cd "/opt/fica/Web App/backend"
--   set -a; source .env; set +a
--   mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
--         -h "$DATABASE_HOST" -P "$DATABASE_PORT" \
--         "$DATABASE_NAME" \
--         < migrations/2026-04-16c_panel_discussion_feature.sql

START TRANSACTION;

CREATE TABLE IF NOT EXISTS panel_members (
  session_id INT NOT NULL,
  attendee_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, attendee_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS panel_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  attendee_id INT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
  INDEX idx_panel_questions_session (session_id, created_at)
);

-- Seed the toggle enabled by default. Upsert so re-running doesn't
-- clobber an admin's existing "false" setting.
INSERT INTO event_settings (setting_key, setting_value)
VALUES ('panel_discussion_enabled', 'true')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

COMMIT;

-- Verify — both tables should exist (row count 0 on first run) and the
-- toggle should be present in event_settings.
SELECT 'panel_members' AS table_name, COUNT(*) AS row_count FROM panel_members
UNION ALL
SELECT 'panel_questions', COUNT(*) FROM panel_questions
UNION ALL
SELECT 'panel_discussion_enabled setting', COUNT(*)
  FROM event_settings WHERE setting_key = 'panel_discussion_enabled';
