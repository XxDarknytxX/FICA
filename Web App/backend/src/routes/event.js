// src/routes/event.js
import { Router } from "express";
import { requireAuth, requireAdmin, requireAdminOrModerator } from "../middleware/auth.js";

/**
 * The admin panel is served from two sibling routers mounted under
 * /api/event:
 *
 *   • `requireAdmin`              — everything attendee/speaker/session
 *                                    related, plus user management and
 *                                    directory/messaging/meetings admin.
 *   • `requireAdminOrModerator`   — the four tabs a moderator is given:
 *                                    announcements, projects & voting,
 *                                    panel discussions, and the aggregate
 *                                    moderator dashboard.
 *
 * Using two sub-routers rather than a single `r.use(...)` + per-handler
 * checks means a missed check can't accidentally leak an admin-only
 * endpoint to a moderator — if it's declared on the `admin` sub-router,
 * the middleware rejects non-admins at the router boundary.
 */
export function makeEventRouter(controller) {
  const r = Router();

  // ─── ADMIN-ONLY SUB-ROUTER ────────────────────────────────────────────
  const admin = Router();
  admin.use(requireAdmin);

  // Stats
  admin.get("/stats", controller.getStats);

  // Speakers
  admin.get("/speakers", controller.getSpeakers);
  admin.post("/speakers", controller.createSpeaker);
  admin.put("/speakers/:id", controller.updateSpeaker);
  admin.delete("/speakers/:id", controller.deleteSpeaker);

  // Sessions / Agenda
  admin.get("/sessions", controller.getSessions);
  admin.post("/sessions", controller.createSession);
  admin.put("/sessions/:id", controller.updateSession);
  admin.delete("/sessions/:id", controller.deleteSession);

  // Sponsors
  admin.get("/sponsors", controller.getSponsors);
  admin.post("/sponsors", controller.createSponsor);
  admin.put("/sponsors/:id", controller.updateSponsor);
  admin.delete("/sponsors/:id", controller.deleteSponsor);

  // Networking events
  admin.get("/networking", controller.getNetworking);
  admin.post("/networking", controller.createNetworking);
  admin.put("/networking/:id", controller.updateNetworking);
  admin.delete("/networking/:id", controller.deleteNetworking);

  // Attendees (registration management)
  admin.get("/attendees", controller.getAttendees);
  admin.post("/attendees", controller.createAttendee);
  admin.put("/attendees/:id", controller.updateAttendee);
  admin.delete("/attendees/:id", controller.deleteAttendee);
  admin.post("/attendees/:id/checkin", controller.checkInAttendee);

  // Settings
  admin.get("/settings", controller.getSettings);
  admin.put("/settings", controller.updateSettings);

  // User / Account Management
  admin.get("/users", controller.getUsers);
  admin.post("/users/:id/password", controller.setUserPassword);
  admin.post("/users/:id/toggle", controller.toggleUserActive);
  admin.put("/users/:id/profile", controller.updateUserProfile);
  admin.post("/users/:id/send-onboarding", controller.sendUserOnboarding);
  admin.post("/users/:id/send-reset", controller.sendUserResetPassword);
  admin.put("/users/:id", controller.updateUser);
  admin.delete("/users/:id", controller.deleteUser);

  // SMTP test
  admin.post("/settings/test-smtp", controller.sendTestSmtp);

  // Attendee Directory (networking)
  admin.get("/directory", controller.getDirectory);
  admin.get("/directory/:id", controller.getAttendeeProfile);

  // Messaging
  admin.get("/messages", controller.getMessages);
  admin.get("/messages/conversation", controller.getConversation);
  admin.get("/messages/stats", controller.getMessageStats);
  admin.post("/messages", controller.sendMessage);
  admin.delete("/messages/:id", controller.deleteMessage);

  // Connections
  admin.get("/connections", controller.getConnections);
  admin.post("/connections", controller.createConnection);
  admin.put("/connections/:id", controller.updateConnectionStatus);
  admin.delete("/connections/:id", controller.deleteConnection);

  // Networking Stats
  admin.get("/networking-stats", controller.getNetworkingStats);

  // Meetings
  admin.get("/meetings", controller.getMeetings);
  admin.post("/meetings", controller.createMeeting);
  admin.put("/meetings/:id", controller.updateMeeting);
  admin.delete("/meetings/:id", controller.deleteMeeting);

  // Vote details (per-project voter list) — admin-only for privacy
  admin.get("/votes/details/:projectId", controller.getVoteDetails);

  // Panel member assignment — admin-only (controls who's on stage)
  admin.get("/panel-members/:sessionId", controller.getPanelMembers);
  admin.put("/panel-members/:sessionId", controller.setPanelMembers);

  // ─── ADMIN OR MODERATOR SUB-ROUTER ────────────────────────────────────
  const mod = Router();
  mod.use(requireAdminOrModerator);

  // Aggregate dashboard — one GET to render the moderator control tablet
  mod.get("/mod-dashboard", controller.getModDashboard);

  // Announcements
  mod.get("/announcements", controller.getAnnouncements);
  mod.post("/announcements", controller.createAnnouncement);
  mod.put("/announcements/:id", controller.updateAnnouncement);
  mod.delete("/announcements/:id", controller.deleteAnnouncement);

  // Projects & Voting
  mod.get("/projects", controller.getProjects);
  mod.post("/projects", controller.createProject);
  mod.put("/projects/:id", controller.updateProject);
  mod.delete("/projects/:id", controller.deleteProject);
  mod.get("/votes/results", controller.getVoteResults);
  mod.post("/votes/toggle", controller.toggleVoting);
  mod.post("/votes/toggle-results", controller.toggleVotingResults);

  // Panels — list + discussion open/close + question moderation
  mod.get("/panels", controller.getAdminPanels);
  mod.put("/panels/:id/discussion", controller.togglePanelDiscussion);
  mod.get("/panels/:id/questions", controller.getModPanelQuestions);
  mod.put("/panels/questions/:id/read", controller.setPanelQuestionRead);
  mod.delete("/panels/questions/:id", controller.dismissPanelQuestion);

  // Mount mod FIRST, then admin. Order matters: `admin.use(requireAdmin)`
  // fires on every request entering the admin sub-router, including paths
  // that don't have an admin route defined — so if admin is mounted first
  // a moderator token hitting /announcements (a mod-allowed path) would
  // 403 on the admin middleware before ever reaching mod.
  //
  // With mod first:
  //   • moderator → /announcements  : mod matches, handler runs.
  //   • moderator → /speakers       : mod has no match, falls through to
  //                                    admin, requireAdmin 403s correctly.
  //   • admin     → /speakers       : mod has no match, falls through,
  //                                    requireAdmin passes, handler runs.
  //   • admin     → /announcements  : mod matches (requireAdminOrModerator
  //                                    also accepts admin), handler runs.
  r.use(mod);
  r.use(admin);

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

  // Panel Discussion
  r.get("/panels", requireAuth, controller.getPanels);
  r.get("/panels/:id/questions", requireAuth, controller.getPanelQuestions);
  r.post("/panels/:id/questions", requireAuth, controller.postPanelQuestion);

  return r;
}
