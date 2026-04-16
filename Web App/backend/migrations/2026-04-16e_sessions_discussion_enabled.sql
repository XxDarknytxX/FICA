-- 2026-04-16e — Per-panel discussion_enabled flag
--
-- Adds `discussion_enabled BOOLEAN DEFAULT TRUE` to the sessions table so
-- each panel can be opened/closed independently. Replaces the previous
-- global event_settings toggle; the admin "Panel Discussions" page lists
-- every type='panel' session and lets admins flip each one.
--
-- Idempotent — uses INFORMATION_SCHEMA to skip the ALTER if the column
-- already exists, so re-running this migration is safe.
--
-- Apply on VPS:
--   cd "/opt/fica/Web App/backend"
--   set -a; source .env; set +a
--   mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
--         -h "$DATABASE_HOST" -P "$DATABASE_PORT" \
--         "$DATABASE_NAME" \
--         < migrations/2026-04-16e_sessions_discussion_enabled.sql

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sessions'
    AND COLUMN_NAME = 'discussion_enabled'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE sessions ADD COLUMN discussion_enabled BOOLEAN DEFAULT TRUE',
  'SELECT ''discussion_enabled column already exists; no-op'' AS note'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify — should show discussion_enabled in the column list and every
-- existing row defaulted to 1 (open).
SELECT COUNT(*) AS panel_rows,
       SUM(CASE WHEN discussion_enabled = 1 THEN 1 ELSE 0 END) AS open_panels,
       SUM(CASE WHEN discussion_enabled = 0 THEN 1 ELSE 0 END) AS closed_panels
  FROM sessions WHERE type = 'panel';
