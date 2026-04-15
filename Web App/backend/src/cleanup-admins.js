// src/cleanup-admins.js
// One-shot cleanup: leave a single admin (admin@fica.org.fj) in the `users` table.
// Does NOT touch attendees, speakers, sessions, sponsors, announcements, settings, etc.
//
// Usage:
//   cd backend && node src/cleanup-admins.js
//
// Optional flag: --password=<new_password>   (defaults to "abcd1234")

import "dotenv/config";
import bcrypt from "bcryptjs";
import { getPool } from "./config/db.js";

const KEEP_EMAIL = "admin@fica.org.fj";
const DEFAULT_PASSWORD = "abcd1234";

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function run() {
  const pool = await getPool();
  try {
    // 1. Snapshot before
    const [before] = await pool.query("SELECT id, email, created_at FROM users ORDER BY id ASC");
    console.log(`\nFound ${before.length} admin account(s) in the users table:`);
    before.forEach(u => console.log(`  • ${u.email}  (id=${u.id})`));

    if (before.length === 1 && before[0].email === KEEP_EMAIL) {
      console.log(`\n✓ Already clean — only ${KEEP_EMAIL} exists. Nothing to do.`);
      return;
    }

    // 2. Delete everyone except the one we want to keep
    const [del] = await pool.query("DELETE FROM users WHERE email != ?", [KEEP_EMAIL]);
    console.log(`\nDeleted ${del.affectedRows} extra admin(s).`);

    // 3. Ensure the keeper exists. If not, create it with the default/given password.
    const [[keeper]] = await pool.query("SELECT id FROM users WHERE email = ?", [KEEP_EMAIL]);
    if (!keeper) {
      const password = argValue("password") || DEFAULT_PASSWORD;
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        [KEEP_EMAIL, hash]
      );
      console.log(`✓ Re-inserted ${KEEP_EMAIL} with password "${password}".`);
    } else {
      console.log(`✓ Kept existing ${KEEP_EMAIL} (no password change).`);
    }

    // 4. Also sweep any dangling reset tokens for the deleted admins
    const [tokens] = await pool.query(
      "DELETE FROM event_settings WHERE setting_key LIKE 'reset_token_admin_%'"
    );
    if (tokens.affectedRows > 0) {
      console.log(`✓ Cleared ${tokens.affectedRows} stale admin reset token(s).`);
    }

    // 5. Snapshot after
    const [after] = await pool.query("SELECT id, email FROM users ORDER BY id ASC");
    console.log(`\nFinal state — ${after.length} admin(s):`);
    after.forEach(u => console.log(`  • ${u.email}  (id=${u.id})`));
    console.log("\n✅ Done.\n");
  } catch (e) {
    console.error("\n❌ Cleanup failed:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
