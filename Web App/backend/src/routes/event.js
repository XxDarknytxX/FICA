// src/routes/event.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export function makeEventRouter(controller) {
  const r = Router();

  // All admin event routes require admin JWT
  r.use(requireAuth);

  // Stats
  r.get("/stats", controller.getStats);

  // Speakers
  r.get("/speakers", controller.getSpeakers);
  r.post("/speakers", controller.createSpeaker);
  r.put("/speakers/:id", controller.updateSpeaker);
  r.delete("/speakers/:id", controller.deleteSpeaker);

  // Sessions / Agenda
  r.get("/sessions", controller.getSessions);
  r.post("/sessions", controller.createSession);
  r.put("/sessions/:id", controller.updateSession);
  r.delete("/sessions/:id", controller.deleteSession);

  // Sponsors
  r.get("/sponsors", controller.getSponsors);
  r.post("/sponsors", controller.createSponsor);
  r.put("/sponsors/:id", controller.updateSponsor);
  r.delete("/sponsors/:id", controller.deleteSponsor);

  // Networking events
  r.get("/networking", controller.getNetworking);
  r.post("/networking", controller.createNetworking);
  r.put("/networking/:id", controller.updateNetworking);
  r.delete("/networking/:id", controller.deleteNetworking);

  // Attendees (registration management)
  r.get("/attendees", controller.getAttendees);
  r.post("/attendees", controller.createAttendee);
  r.put("/attendees/:id", controller.updateAttendee);
  r.delete("/attendees/:id", controller.deleteAttendee);
  r.post("/attendees/:id/checkin", controller.checkInAttendee);

  // Announcements
  r.get("/announcements", controller.getAnnouncements);
  r.post("/announcements", controller.createAnnouncement);
  r.put("/announcements/:id", controller.updateAnnouncement);
  r.delete("/announcements/:id", controller.deleteAnnouncement);

  // Settings
  r.get("/settings", controller.getSettings);
  r.put("/settings", controller.updateSettings);

  // ─── User / Account Management ──────────────────────────────────────────
  r.get("/users", controller.getUsers);
  r.post("/users/:id/password", controller.setUserPassword);
  r.post("/users/:id/toggle", controller.toggleUserActive);
  r.put("/users/:id/profile", controller.updateUserProfile);

  // ─── Attendee Directory (networking) ────────────────────────────────────
  r.get("/directory", controller.getDirectory);
  r.get("/directory/:id", controller.getAttendeeProfile);

  // ─── Messaging ───────────────────────────────────────────────────────────
  r.get("/messages", controller.getMessages);
  r.get("/messages/conversation", controller.getConversation);
  r.get("/messages/stats", controller.getMessageStats);
  r.post("/messages", controller.sendMessage);
  r.delete("/messages/:id", controller.deleteMessage);

  // ─── Connections ─────────────────────────────────────────────────────────
  r.get("/connections", controller.getConnections);
  r.post("/connections", controller.createConnection);
  r.put("/connections/:id", controller.updateConnectionStatus);
  r.delete("/connections/:id", controller.deleteConnection);

  // ─── Networking Stats ──────────────────────────────────────────────────
  r.get("/networking-stats", controller.getNetworkingStats);

  // ─── Meetings ──────────────────────────────────────────────────────────
  r.get("/meetings", controller.getMeetings);
  r.post("/meetings", controller.createMeeting);
  r.put("/meetings/:id", controller.updateMeeting);
  r.delete("/meetings/:id", controller.deleteMeeting);

  // ─── Projects & Voting ────────────────────────────────────────────────
  r.get("/projects", controller.getProjects);
  r.post("/projects", controller.createProject);
  r.put("/projects/:id", controller.updateProject);
  r.delete("/projects/:id", controller.deleteProject);
  r.get("/votes/results", controller.getVoteResults);
  r.get("/votes/details/:projectId", controller.getVoteDetails);
  r.post("/votes/toggle", controller.toggleVoting);

  return r;
}

// ─── Delegate (Mobile App) Router ────────────────────────────────────────────
export function makeDelegateRouter(controller) {
  const r = Router();

  // Public — no auth required
  r.post("/login", controller.delegateLogin);

  // Protected — delegate JWT
  r.get("/me", requireAuth, controller.getMyProfile);
  r.get("/directory", requireAuth, controller.getDirectory);
  r.get("/directory/:id", requireAuth, controller.getAttendeeProfile);
  r.get("/messages", requireAuth, controller.getMessages);
  r.get("/messages/conversation", requireAuth, controller.getConversation);
  r.post("/messages", requireAuth, controller.sendMessage);
  r.post("/messages/read", requireAuth, controller.markAsRead);
  r.delete("/messages/:id", requireAuth, controller.deleteMessage);

  // Connections
  r.get("/connections", requireAuth, controller.getConnections);
  r.post("/connections", requireAuth, controller.createConnection);
  r.put("/connections/:id", requireAuth, controller.updateConnectionStatus);

  // Meetings
  r.get("/meetings", requireAuth, controller.getMeetings);
  r.post("/meetings", requireAuth, controller.createMeeting);
  r.put("/meetings/:id", requireAuth, controller.updateMeeting);

  // Read-only event data for mobile app
  r.get("/sessions", requireAuth, controller.getSessions);
  r.get("/speakers", requireAuth, controller.getSpeakers);
  r.get("/sponsors", requireAuth, controller.getSponsors);
  r.get("/announcements", requireAuth, controller.getAnnouncements);
  r.get("/networking", requireAuth, controller.getNetworking);
  r.get("/settings", requireAuth, controller.getSettings);

  // Projects & Voting
  r.get("/projects", requireAuth, controller.getDelegateProjects);
  r.post("/vote", requireAuth, controller.castVote);
  r.delete("/vote", requireAuth, controller.removeVote);

  return r;
}
