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