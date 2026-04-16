// API base URL resolution:
//   1. VITE_API_URL env var (explicit override)               → use it
//   2. Vite dev mode                                          → localhost backend
//   3. Production build                                       → same-origin /api
//
// Same-origin in production avoids the "Load failed" trap we hit when the
// admin frontend was deployed with no VITE_API_URL set — the browser was
// trying to reach http://localhost:5000/api on the user's own machine.
// Nginx proxies /api to the Node backend on the VPS, so a relative /api
// works out of the box on eventsfiji.cloud.
const API_BASE_URL =
  import.meta.env.VITE_API_URL
  || (import.meta.env.DEV
      ? "http://localhost:5000/api"
      : `${window.location.origin}/api`);

/**
 * Helper to add Authorization header when token exists
 */
function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Read the current user's role. We stash it in localStorage at login
 * time (the backend echoes it back alongside the token) and also fall
 * back to decoding the JWT payload if the local copy is missing — which
 * means older sessions that predate this change still report correctly
 * without forcing a re-login.
 *
 * Returns one of: "admin" | "moderator" | "delegate" | null
 */
export function getAuthRole() {
  const cached = localStorage.getItem("role");
  if (cached) return cached;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
}

/**
 * True when the current user can view the full admin surface (not a
 * moderator-only account). Used by page-level guards and by the sidebar
 * to decide what tabs to render.
 */
export function isAdmin() {
  return getAuthRole() === "admin";
}

export function isModerator() {
  return getAuthRole() === "moderator";
}

/**
 * Generic API wrapper
 */
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeader() : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}