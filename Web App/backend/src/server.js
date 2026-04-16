// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { getPool } from "./config/db.js";
import { makeAdminController } from "./controllers/adminController.js";
import { makeEventController, initEventTables } from "./controllers/eventController.js";
import { makeAuthRouter } from "./routes/auth.js";
import { makeEventRouter, makeDelegateRouter } from "./routes/event.js";

// ── Startup config validation ───────────────────────────────────────────────
// Refuse to boot with a missing or obviously-weak JWT_SECRET. A short or
// default secret means every JWT we issue can be forged trivially, which
// is a full compromise of both admin and delegate auth.
(() => {
  const KNOWN_WEAK = new Set([
    "dev-secret-change-me",
    "change-me",
    "secret",
    "password",
    "jwt-secret",
    "your-secret-here",
  ]);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
    process.exit(1);
  }
  if (KNOWN_WEAK.has(secret.trim().toLowerCase())) {
    console.error("FATAL: JWT_SECRET is a known weak default. Rotate it before starting.");
    process.exit(1);
  }
  if (secret.length < 32) {
    console.error(`FATAL: JWT_SECRET is too short (${secret.length} chars, need >= 32). Rotate it.`);
    process.exit(1);
  }
  // Soft warnings for common misconfigurations.
  if (process.env.NODE_ENV === "production") {
    const origin = process.env.CORS_ORIGIN;
    if (!origin || origin === "*") {
      console.warn("WARN: CORS_ORIGIN is unset or '*' in production. Set it to your admin domain.");
    }
  }
})();

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());

// ── WebSocket server ────────────────────────────────────────────────────────
// noServer: true lets us intercept the HTTP upgrade and verify the JWT from
// the upgrade URL *before* accepting the socket. Previously the socket was
// accepted unconditionally and any client could JSON-send {"event":"join",
// "userId":<anyone>} to start receiving another delegate's messages, panel
// questions, and voting updates.
const wss = new WebSocketServer({ noServer: true });

// Map userId → Set of connected WebSocket clients
const userSockets = new Map();

function broadcastToUser(userId, event, data) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify({ event, data });
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// Fan-out to every connected socket. Used for events that concern every
// delegate — e.g. admin toggling a panel's discussion open/closed.
function broadcastAll(event, data) {
  const payload = JSON.stringify({ event, data });
  for (const sockets of userSockets.values()) {
    for (const ws of sockets) {
      if (ws.readyState === 1) ws.send(payload);
    }
  }
}

// Authenticate the upgrade request before handing it to wss. We extract the
// JWT from `?token=...`, verify it, and stash the decoded payload on the
// upgraded socket. Reject with 401 (pre-upgrade HTTP response) for missing
// or malformed tokens, and reject with close code 4001 post-upgrade for
// anything else.
httpServer.on("upgrade", (req, socket, head) => {
  // Only intercept /ws upgrades; leave any other path alone.
  const url = new URL(req.url, "http://internal");
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token");
  if (!token) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const userId = Number(decoded?.id);
  if (!userId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    // Stash authenticated identity on the socket so the connection handler
    // trusts it instead of any client-supplied value.
    ws._authUserId = userId;
    ws._authRole = decoded.role || "delegate";
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  const userId = ws._authUserId;
  if (!userId) {
    ws.close(4001, "unauthenticated");
    return;
  }
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(ws);
  console.log(`WS: user ${userId} joined (role=${ws._authRole})`);

  ws.on("message", (raw) => {
    // We no longer trust `{event:"join",userId}` to add a subscription —
    // userId is derived from the verified JWT on the upgrade. Keep the
    // handler as a no-op so older clients that still send a join message
    // don't get logged as errors.
    try {
      const msg = JSON.parse(raw);
      if (msg?.event === "join") return;
    } catch (_) {}
  });

  ws.on("close", () => {
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(ws);
      if (userSockets.get(userId).size === 0) userSockets.delete(userId);
      console.log(`WS: user ${userId} disconnected`);
    }
  });
});

// DB + init
const pool = await getPool();
await initEventTables(pool);

const admin = makeAdminController(pool);
const event = makeEventController(pool, broadcastToUser, broadcastAll);

// Admin panel routes
app.use("/api", makeAuthRouter(admin, event));
app.use("/api/event", makeEventRouter(event));

// Mobile app (delegate) routes
app.use("/api/delegate", makeDelegateRouter(event));

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", app: "FICA Congress 2026" }));

const port = process.env.PORT || 5000;
httpServer.listen(port, () => console.log(`FICA Congress API → http://localhost:${port}`));
