// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { getPool } from "./config/db.js";
import { makeAdminController } from "./controllers/adminController.js";
import { makeEventController, initEventTables } from "./controllers/eventController.js";
import { makeAuthRouter } from "./routes/auth.js";
import { makeEventRouter, makeDelegateRouter } from "./routes/event.js";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());

// ── WebSocket server ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

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

wss.on("connection", (ws) => {
  let userId = null;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.event === "join" && msg.userId) {
        userId = Number(msg.userId);
        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(ws);
        console.log(`WS: user ${userId} joined`);
      }
    } catch (_) {}
  });

  ws.on("close", () => {
    if (userId && userSockets.has(userId)) {
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
const event = makeEventController(pool, broadcastToUser);

// Admin panel routes
app.use("/api", makeAuthRouter(admin));
app.use("/api/event", makeEventRouter(event));

// Mobile app (delegate) routes
app.use("/api/delegate", makeDelegateRouter(event));

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", app: "FICA Congress 2026" }));

const port = process.env.PORT || 5000;
httpServer.listen(port, () => console.log(`FICA Congress API → http://localhost:${port}`));
