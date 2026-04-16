// src/controllers/adminController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";

/** Local response helpers (kept inside the controller, per your preference) */
const send = {
  ok: (res, data = {}) => res.json(data),
  created: (res, data = {}) => res.status(201).json(data),
  bad: (res, msg = "Bad request") => res.status(400).json({ error: msg }),
  unauthorized: (res, msg = "Unauthorized") => res.status(401).json({ error: msg }),
  serverErr: (res, msg = "Internal server error") => res.status(500).json({ error: msg }),
};

/** Thin data-access helpers */
async function findUserByEmail(pool, email) {
  const [rows] = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = ?",
    [email]
  );
  return rows[0] || null;
}

async function createUser(pool, { email, passwordHash, role = "admin" }) {
  const [res] = await pool.query(
    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
    [email, passwordHash, role]
  );
  return { id: res.insertId, email, role };
}

/** Factory */
export function makeAdminController(pool) {
  return {
    // POST /api/register  (admin-only; gated by requireAdmin in the router)
    // Accepts optional `role` in body — defaults to 'admin' for parity with
    // the original behaviour. Use /api/moderators for creating moderators
    // (dedicated endpoint with the role hard-coded).
    register: async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return send.bad(res, errors.array()[0].msg);

      const { email, password } = req.body;
      const role = req.body.role === "moderator" ? "moderator" : "admin";
      try {
        const existing = await findUserByEmail(pool, email);
        if (existing) return send.bad(res, "Email already registered");

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser(pool, { email, passwordHash, role });
        return send.created(res, { id: user.id, email: user.email, role: user.role });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },

    // POST /api/login
    // Supports both admins and moderators via the same endpoint. The role
    // stored on the user row is written into the JWT so downstream route
    // middleware (requireAdmin / requireAdminOrModerator) can gate access.
    login: async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return send.bad(res, errors.array()[0].msg);

      const { email, password } = req.body;
      try {
        const user = await findUserByEmail(pool, email);
        if (!user) return send.bad(res, "Invalid credentials");

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return send.bad(res, "Invalid credentials");

        const role = user.role === "moderator" ? "moderator" : "admin";
        const token = jwt.sign(
          { id: user.id, email: user.email, role },
          process.env.JWT_SECRET,
          { expiresIn: "2h" },
        );
        // Echo the role back so the frontend can pick its landing page
        // (admin → /dashboard, moderator → /moderator) without decoding
        // the token itself.
        return send.ok(res, { token, role });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },

    // GET /api/me  (any authenticated role — delegate too)
    me: async (req, res) => send.ok(res, {
      user: { id: req.user.id, email: req.user.email, role: req.user.role || "delegate" },
    }),

    // GET /api/dashboard (placeholder)
    dashboard: async (_req, res) => send.ok(res, { widgets: [] }),

    // ─── Moderator management (admin-only CRUD over `users` rows) ─────────
    // GET /api/moderators
    listModerators: async (_req, res) => {
      try {
        const [rows] = await pool.query(
          "SELECT id, email, role, created_at FROM users WHERE role='moderator' ORDER BY email ASC"
        );
        return send.ok(res, { moderators: rows });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },

    // POST /api/moderators  { email, password }
    createModerator: async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return send.bad(res, errors.array()[0].msg);
      const { email, password } = req.body;
      try {
        const existing = await findUserByEmail(pool, email);
        if (existing) return send.bad(res, "Email already in use");
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser(pool, { email, passwordHash, role: "moderator" });
        return send.created(res, { id: user.id, email: user.email, role: "moderator" });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },

    // POST /api/moderators/:id/password  { password }
    setModeratorPassword: async (req, res) => {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || password.length < 6) {
        return send.bad(res, "Password must be at least 6 characters");
      }
      try {
        const hash = await bcrypt.hash(password, 10);
        const [r] = await pool.query(
          "UPDATE users SET password_hash=? WHERE id=? AND role='moderator'",
          [hash, id]
        );
        if (r.affectedRows === 0) return send.bad(res, "Moderator not found");
        return send.ok(res, { success: true });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },

    // DELETE /api/moderators/:id
    deleteModerator: async (req, res) => {
      const { id } = req.params;
      try {
        const [r] = await pool.query(
          "DELETE FROM users WHERE id=? AND role='moderator'",
          [id]
        );
        if (r.affectedRows === 0) return send.bad(res, "Moderator not found");
        return send.ok(res, { success: true });
      } catch (e) {
        console.error(e);
        return send.serverErr(res);
      }
    },
  };
}
