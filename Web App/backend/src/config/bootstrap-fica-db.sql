-- Run this ONCE as MySQL root (or any user with CREATE + GRANT privileges):
--   /usr/local/mysql/bin/mysql -u root -p < backend/src/config/bootstrap-fica-db.sql
--
-- Creates a dedicated database for FICA Congress and grants the existing
-- `base_admin` user full access to it. After this runs, the FICA backend
-- will auto-create all tables and bootstrap the default admin on first start.

CREATE DATABASE IF NOT EXISTS fica_congress
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON fica_congress.* TO 'base_admin'@'localhost';

FLUSH PRIVILEGES;

SHOW DATABASES LIKE 'fica_congress';
SHOW GRANTS FOR 'base_admin'@'localhost';
