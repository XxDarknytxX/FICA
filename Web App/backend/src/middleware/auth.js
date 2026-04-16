// src/middleware/auth.js
import jwt from "jsonwebtoken";

/**
 * Require a valid JWT of any role. Populates `req.user` with the decoded
 * payload — { id, email, role?, iat, exp }.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require a valid admin JWT (role === "admin"). Delegate JWTs are
 * rejected with 403 even though the token itself is valid. Covers the
 * full /api/event/* surface — previously any valid JWT (including
 * delegate) could hit admin routes because only requireAuth was applied.
 */
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  if (decoded?.role !== "admin") {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  req.user = decoded;
  next();
}
