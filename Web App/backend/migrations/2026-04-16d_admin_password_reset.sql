-- 2026-04-16d — Admin login password reset
--
-- Forces the admin@fica.com account back to password "admin123" using a
-- bcrypt hash generated locally with bcryptjs (same library the backend
-- authenticates against, so the compareSync on /api/login will succeed).
--
-- Also upserts the row, so if the admin account got deleted somehow this
-- migration will recreate it.
--
-- After applying, log in with:
--   Email:    admin@fica.com
--   Password: admin123
-- Then change the password via the admin UI if you want something else.
--
-- Apply on VPS:
--   cd "/opt/fica/Web App/backend"
--   set -a; source .env; set +a
--   mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
--         -h "$DATABASE_HOST" -P "$DATABASE_PORT" \
--         "$DATABASE_NAME" \
--         < migrations/2026-04-16d_admin_password_reset.sql

START TRANSACTION;

INSERT INTO users (email, password_hash)
VALUES ('admin@fica.com', '$2b$10$3/L8A1e77Co7msVkmBVD/uuvbRUSVYFsScSn0jadIgBTGLoqWznvS')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

COMMIT;

-- Verify — should show exactly one row for admin@fica.com.
SELECT id, email, created_at FROM users WHERE email = 'admin@fica.com';
