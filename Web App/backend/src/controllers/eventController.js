// src/controllers/eventController.js

import bcrypt from "bcryptjs";
import {
  sendEmail,
  generateResetToken,
  storeResetToken,
  validateResetToken,
  onboardingEmail,
  resetPasswordEmail,
  testEmail,
} from "../utils/mailer.js";

const send = {
  ok: (res, data = {}) => res.json(data),
  created: (res, data = {}) => res.status(201).json(data),
  bad: (res, msg = "Bad request") => res.status(400).json({ error: msg }),
  notFound: (res, msg = "Not found") => res.status(404).json({ error: msg }),
  serverErr: (res, msg = "Internal server error") => res.status(500).json({ error: msg }),
  unauthorized: (res, msg = "Unauthorized") => res.status(401).json({ error: msg }),
};

export async function initEventTables(pool) {
  // Admin users table — owned by the FICA app in this dedicated database.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bootstrap a default admin if the table is empty so the dashboard is usable
  // on a fresh install without running the seed.
  const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM users");
  if (count === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      ["admin@fica.com", hash]
    );
    console.log("✓ Bootstrapped default admin: admin@fica.com / admin123");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS speakers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      organization VARCHAR(255),
      bio TEXT,
      photo_url VARCHAR(500),
      email VARCHAR(255),
      linkedin VARCHAR(500),
      twitter VARCHAR(255),
      is_keynote BOOLEAN DEFAULT FALSE,
      display_order INT DEFAULT 0,
      congress_year INT DEFAULT 2026,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      session_date DATE NOT NULL,
      room VARCHAR(255),
      type ENUM('keynote','panel','workshop','break','networking','registration','lunch','ceremony','awards') DEFAULT 'keynote',
      speaker_id INT,
      moderator VARCHAR(255),
      capacity INT,
      display_order INT DEFAULT 0,
      congress_year INT DEFAULT 2026,
      session_group VARCHAR(50),
      discussion_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE SET NULL
    )
  `);
  // discussion_enabled is a per-panel open/close flag. Older databases
  // created before this column existed won't get it from CREATE TABLE IF
  // NOT EXISTS, so add it idempotently here.
  try {
    await pool.query("ALTER TABLE sessions ADD COLUMN discussion_enabled BOOLEAN DEFAULT TRUE");
  } catch (e) {
    if (!String(e.message || "").includes("Duplicate column")) throw e;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      logo_url VARCHAR(500),
      website VARCHAR(500),
      tier ENUM('platinum','gold','silver','bronze','supporter','media') DEFAULT 'gold',
      description TEXT,
      contact_name VARCHAR(255),
      contact_email VARCHAR(255),
      display_order INT DEFAULT 0,
      congress_year INT DEFAULT 2026,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS networking_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      slot_date DATE NOT NULL,
      location VARCHAR(255),
      capacity INT,
      type ENUM('cocktail','lunch','coffee','dinner','gala','tour','breakfast') DEFAULT 'cocktail',
      dress_code VARCHAR(255),
      congress_year INT DEFAULT 2026,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      organization VARCHAR(255),
      job_title VARCHAR(255),
      phone VARCHAR(50),
      registration_code VARCHAR(50) UNIQUE,
      ticket_type ENUM('full','day1','day2','virtual','vip') DEFAULT 'full',
      check_in_day1 BOOLEAN DEFAULT FALSE,
      check_in_day2 BOOLEAN DEFAULT FALSE,
      dietary_requirements VARCHAR(255),
      notes TEXT,
      password_hash VARCHAR(255),
      account_active BOOLEAN DEFAULT TRUE,
      bio TEXT,
      photo_url VARCHAR(500),
      linkedin VARCHAR(500),
      twitter VARCHAR(255),
      website VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add columns if tables already exist (migration safety)
  const addColSafely = async (table, col, definition) => {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
    } catch (e) {
      if (!e.message.includes("Duplicate column")) throw e;
    }
  };
  await addColSafely("attendees", "password_hash", "VARCHAR(255)");
  await addColSafely("attendees", "account_active", "BOOLEAN DEFAULT TRUE");
  await addColSafely("attendees", "bio", "TEXT");
  await addColSafely("attendees", "photo_url", "VARCHAR(500)");
  await addColSafely("attendees", "linkedin", "VARCHAR(500)");
  await addColSafely("attendees", "twitter", "VARCHAR(255)");
  await addColSafely("attendees", "website", "VARCHAR(500)");

  // congress_year migration for existing tables
  await addColSafely("speakers", "congress_year", "INT DEFAULT 2026");
  await addColSafely("sessions", "congress_year", "INT DEFAULT 2026");
  await addColSafely("sessions", "session_group", "VARCHAR(50)");
  await addColSafely("sponsors", "congress_year", "INT DEFAULT 2026");
  await addColSafely("networking_slots", "congress_year", "INT DEFAULT 2026");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES attendees(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester_id INT NOT NULL,
      requested_id INT NOT NULL,
      status ENUM('pending','accepted','declined') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_conn (requester_id, requested_id),
      FOREIGN KEY (requester_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_id) REFERENCES attendees(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester_id INT NOT NULL,
      requested_id INT NOT NULL,
      title VARCHAR(255),
      meeting_date DATE,
      start_time TIME,
      end_time TIME,
      location VARCHAR(255),
      notes TEXT,
      status ENUM('pending','accepted','declined','cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES attendees(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_id) REFERENCES attendees(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      type ENUM('info','warning','alert','update','reminder') DEFAULT 'info',
      target ENUM('all','day1','day2','vip','virtual') DEFAULT 'all',
      published BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      team VARCHAR(255),
      image_url VARCHAR(500),
      category VARCHAR(100),
      display_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      attendee_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY one_vote_per_delegate (attendee_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
    )
  `);

  // ─── Panel Discussion ──────────────────────────────────────────────────────
  // panel_members: admin-assigned attendees who sit on a given panel session.
  // Used to show the "You're on this panel" badge and to tag that attendee's
  // questions distinctly in the public Q&A list.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_members (
      session_id INT NOT NULL,
      attendee_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, attendee_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
    )
  `);

  // panel_questions: attendee-submitted questions for a specific panel session.
  // Public — every delegate sees every question on the panel they're viewing.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      attendee_id INT NOT NULL,
      question TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
      INDEX idx_panel_questions_session (session_id, created_at)
    )
  `);
}

export function makeEventController(pool, broadcastToUser = null, broadcastAll = null) {
  // ─── STATS ────────────────────────────────────────────────────────────────
  const getStats = async (_req, res) => {
    try {
      const [[{ speakers }]] = await pool.query("SELECT COUNT(*) as speakers FROM speakers");
      const [[{ sessions }]] = await pool.query("SELECT COUNT(*) as sessions FROM sessions");
      const [[{ sponsors }]] = await pool.query("SELECT COUNT(*) as sponsors FROM sponsors");
      const [[{ attendees }]] = await pool.query("SELECT COUNT(*) as attendees FROM attendees");
      const [[{ announcements }]] = await pool.query("SELECT COUNT(*) as announcements FROM announcements WHERE published = TRUE");
      const [[{ networking }]] = await pool.query("SELECT COUNT(*) as networking FROM networking_slots");
      const [[{ checkedIn }]] = await pool.query("SELECT COUNT(*) as checkedIn FROM attendees WHERE check_in_day1 = TRUE OR check_in_day2 = TRUE");
      return send.ok(res, { speakers, sessions, sponsors, attendees, announcements, networking, checkedIn });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── SPEAKERS ─────────────────────────────────────────────────────────────
  const getSpeakers = async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : null;
      let sql = "SELECT * FROM speakers";
      const params = [];
      if (year) { sql += " WHERE congress_year = ?"; params.push(year); }
      sql += " ORDER BY display_order ASC, created_at ASC";
      const [rows] = await pool.query(sql, params);
      return send.ok(res, { speakers: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createSpeaker = async (req, res) => {
    const { name, title, organization, bio, photo_url, email, linkedin, twitter, is_keynote, display_order } = req.body;
    if (!name) return send.bad(res, "Name is required");
    try {
      const [result] = await pool.query(
        "INSERT INTO speakers (name, title, organization, bio, photo_url, email, linkedin, twitter, is_keynote, display_order) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [name, title || null, organization || null, bio || null, photo_url || null, email || null, linkedin || null, twitter || null, is_keynote ? 1 : 0, display_order || 0]
      );
      const [[speaker]] = await pool.query("SELECT * FROM speakers WHERE id = ?", [result.insertId]);
      return send.created(res, { speaker });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateSpeaker = async (req, res) => {
    const { id } = req.params;
    const { name, title, organization, bio, photo_url, email, linkedin, twitter, is_keynote, display_order } = req.body;
    if (!name) return send.bad(res, "Name is required");
    try {
      const [r] = await pool.query(
        "UPDATE speakers SET name=?, title=?, organization=?, bio=?, photo_url=?, email=?, linkedin=?, twitter=?, is_keynote=?, display_order=? WHERE id=?",
        [name, title || null, organization || null, bio || null, photo_url || null, email || null, linkedin || null, twitter || null, is_keynote ? 1 : 0, display_order || 0, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Speaker not found");
      const [[speaker]] = await pool.query("SELECT * FROM speakers WHERE id = ?", [id]);
      return send.ok(res, { speaker });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteSpeaker = async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("UPDATE sessions SET speaker_id = NULL WHERE speaker_id = ?", [id]);
      const [r] = await pool.query("DELETE FROM speakers WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Speaker not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── SESSIONS / AGENDA ────────────────────────────────────────────────────
  const getSessions = async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : null;
      let sql = `
        SELECT s.*, DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date, sp.name AS speaker_name, sp.title AS speaker_title, sp.organization AS speaker_org
        FROM sessions s
        LEFT JOIN speakers sp ON s.speaker_id = sp.id
      `;
      const params = [];
      if (year) { sql += " WHERE s.congress_year = ?"; params.push(year); }
      sql += " ORDER BY s.session_date ASC, s.start_time ASC";
      const [rows] = await pool.query(sql, params);
      return send.ok(res, { sessions: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createSession = async (req, res) => {
    const { title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order } = req.body;
    if (!title || !start_time || !end_time || !session_date) return send.bad(res, "title, start_time, end_time, session_date are required");
    try {
      const [result] = await pool.query(
        "INSERT INTO sessions (title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [title, description || null, start_time, end_time, session_date, room || null, type || "keynote", speaker_id || null, moderator || null, capacity || null, display_order || 0]
      );
      const [[session]] = await pool.query(`
        SELECT s.*, DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date, sp.name AS speaker_name FROM sessions s LEFT JOIN speakers sp ON s.speaker_id = sp.id WHERE s.id = ?
      `, [result.insertId]);
      return send.created(res, { session });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateSession = async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order } = req.body;
    if (!title || !start_time || !end_time || !session_date) return send.bad(res, "title, start_time, end_time, session_date are required");
    try {
      const [r] = await pool.query(
        "UPDATE sessions SET title=?, description=?, start_time=?, end_time=?, session_date=?, room=?, type=?, speaker_id=?, moderator=?, capacity=?, display_order=? WHERE id=?",
        [title, description || null, start_time, end_time, session_date, room || null, type || "keynote", speaker_id || null, moderator || null, capacity || null, display_order || 0, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Session not found");
      const [[session]] = await pool.query(`
        SELECT s.*, DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date, sp.name AS speaker_name FROM sessions s LEFT JOIN speakers sp ON s.speaker_id = sp.id WHERE s.id = ?
      `, [id]);
      return send.ok(res, { session });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteSession = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM sessions WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Session not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── SPONSORS ─────────────────────────────────────────────────────────────
  const getSponsors = async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : null;
      let sql = "SELECT * FROM sponsors";
      const params = [];
      if (year) { sql += " WHERE congress_year = ?"; params.push(year); }
      sql += " ORDER BY FIELD(tier,'platinum','gold','silver','bronze','supporter','media'), display_order ASC";
      const [rows] = await pool.query(sql, params);
      return send.ok(res, { sponsors: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createSponsor = async (req, res) => {
    const { name, logo_url, website, tier, description, contact_name, contact_email, display_order } = req.body;
    if (!name) return send.bad(res, "Name is required");
    try {
      const [result] = await pool.query(
        "INSERT INTO sponsors (name, logo_url, website, tier, description, contact_name, contact_email, display_order) VALUES (?,?,?,?,?,?,?,?)",
        [name, logo_url || null, website || null, tier || "gold", description || null, contact_name || null, contact_email || null, display_order || 0]
      );
      const [[sponsor]] = await pool.query("SELECT * FROM sponsors WHERE id = ?", [result.insertId]);
      return send.created(res, { sponsor });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateSponsor = async (req, res) => {
    const { id } = req.params;
    const { name, logo_url, website, tier, description, contact_name, contact_email, display_order } = req.body;
    if (!name) return send.bad(res, "Name is required");
    try {
      const [r] = await pool.query(
        "UPDATE sponsors SET name=?, logo_url=?, website=?, tier=?, description=?, contact_name=?, contact_email=?, display_order=? WHERE id=?",
        [name, logo_url || null, website || null, tier || "gold", description || null, contact_name || null, contact_email || null, display_order || 0, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Sponsor not found");
      const [[sponsor]] = await pool.query("SELECT * FROM sponsors WHERE id = ?", [id]);
      return send.ok(res, { sponsor });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteSponsor = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM sponsors WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Sponsor not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── NETWORKING SLOTS ─────────────────────────────────────────────────────
  const getNetworking = async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : null;
      let sql = "SELECT *, DATE_FORMAT(slot_date, '%Y-%m-%d') AS slot_date FROM networking_slots";
      const params = [];
      if (year) { sql += " WHERE congress_year = ?"; params.push(year); }
      sql += " ORDER BY slot_date ASC, start_time ASC";
      const [rows] = await pool.query(sql, params);
      return send.ok(res, { slots: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createNetworking = async (req, res) => {
    const { title, description, start_time, end_time, slot_date, location, capacity, type, dress_code } = req.body;
    if (!title || !start_time || !end_time || !slot_date) return send.bad(res, "title, start_time, end_time, slot_date are required");
    try {
      const [result] = await pool.query(
        "INSERT INTO networking_slots (title, description, start_time, end_time, slot_date, location, capacity, type, dress_code) VALUES (?,?,?,?,?,?,?,?,?)",
        [title, description || null, start_time, end_time, slot_date, location || null, capacity || null, type || "cocktail", dress_code || null]
      );
      const [[slot]] = await pool.query("SELECT * FROM networking_slots WHERE id = ?", [result.insertId]);
      return send.created(res, { slot });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateNetworking = async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, slot_date, location, capacity, type, dress_code } = req.body;
    if (!title || !start_time || !end_time || !slot_date) return send.bad(res, "title, start_time, end_time, slot_date are required");
    try {
      const [r] = await pool.query(
        "UPDATE networking_slots SET title=?, description=?, start_time=?, end_time=?, slot_date=?, location=?, capacity=?, type=?, dress_code=? WHERE id=?",
        [title, description || null, start_time, end_time, slot_date, location || null, capacity || null, type || "cocktail", dress_code || null, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Networking slot not found");
      const [[slot]] = await pool.query("SELECT * FROM networking_slots WHERE id = ?", [id]);
      return send.ok(res, { slot });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteNetworking = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM networking_slots WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Networking slot not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── ATTENDEES ────────────────────────────────────────────────────────────
  const getAttendees = async (_req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM attendees ORDER BY created_at DESC");
      return send.ok(res, { attendees: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createAttendee = async (req, res) => {
    const { name, email, organization, job_title, phone, ticket_type, dietary_requirements, notes } = req.body;
    if (!name || !email) return send.bad(res, "Name and email are required");
    try {
      const code = "FICA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const [result] = await pool.query(
        "INSERT INTO attendees (name, email, organization, job_title, phone, registration_code, ticket_type, dietary_requirements, notes) VALUES (?,?,?,?,?,?,?,?,?)",
        [name, email, organization || null, job_title || null, phone || null, code, ticket_type || "full", dietary_requirements || null, notes || null]
      );
      const [[attendee]] = await pool.query("SELECT * FROM attendees WHERE id = ?", [result.insertId]);
      return send.created(res, { attendee });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return send.bad(res, "Email already registered");
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateAttendee = async (req, res) => {
    const { id } = req.params;
    const { name, email, organization, job_title, phone, ticket_type, check_in_day1, check_in_day2, dietary_requirements, notes } = req.body;
    if (!name || !email) return send.bad(res, "Name and email are required");
    try {
      const [r] = await pool.query(
        "UPDATE attendees SET name=?, email=?, organization=?, job_title=?, phone=?, ticket_type=?, check_in_day1=?, check_in_day2=?, dietary_requirements=?, notes=? WHERE id=?",
        [name, email, organization || null, job_title || null, phone || null, ticket_type || "full", check_in_day1 ? 1 : 0, check_in_day2 ? 1 : 0, dietary_requirements || null, notes || null, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Attendee not found");
      const [[attendee]] = await pool.query("SELECT * FROM attendees WHERE id = ?", [id]);
      return send.ok(res, { attendee });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return send.bad(res, "Email already in use");
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteAttendee = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM attendees WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Attendee not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const checkInAttendee = async (req, res) => {
    const { id } = req.params;
    const { day } = req.body;
    if (!day || !["day1", "day2"].includes(day)) return send.bad(res, "day must be 'day1' or 'day2'");
    const field = day === "day1" ? "check_in_day1" : "check_in_day2";
    try {
      const [r] = await pool.query(`UPDATE attendees SET ${field} = NOT ${field} WHERE id = ?`, [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Attendee not found");
      const [[attendee]] = await pool.query("SELECT * FROM attendees WHERE id = ?", [id]);
      return send.ok(res, { attendee });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────
  const getAnnouncements = async (_req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
      return send.ok(res, { announcements: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createAnnouncement = async (req, res) => {
    const { title, body, type, target, published } = req.body;
    if (!title || !body) return send.bad(res, "Title and body are required");
    try {
      const pub = published ? 1 : 0;
      const pubAt = published ? new Date() : null;
      const [result] = await pool.query(
        "INSERT INTO announcements (title, body, type, target, published, published_at) VALUES (?,?,?,?,?,?)",
        [title, body, type || "info", target || "all", pub, pubAt]
      );
      const [[ann]] = await pool.query("SELECT * FROM announcements WHERE id = ?", [result.insertId]);
      return send.created(res, { announcement: ann });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, body, type, target, published } = req.body;
    if (!title || !body) return send.bad(res, "Title and body are required");
    try {
      const pub = published ? 1 : 0;
      const pubAt = published ? new Date() : null;
      const [r] = await pool.query(
        "UPDATE announcements SET title=?, body=?, type=?, target=?, published=?, published_at=? WHERE id=?",
        [title, body, type || "info", target || "all", pub, pubAt, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Announcement not found");
      const [[ann]] = await pool.query("SELECT * FROM announcements WHERE id = ?", [id]);
      return send.ok(res, { announcement: ann });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM announcements WHERE id = ?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Announcement not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  const getSettings = async (_req, res) => {
    try {
      const [rows] = await pool.query("SELECT setting_key, setting_value FROM event_settings");
      const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
      return send.ok(res, { settings });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateSettings = async (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") return send.bad(res, "settings object required");
    try {
      for (const [key, value] of Object.entries(settings)) {
        await pool.query(
          "INSERT INTO event_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?",
          [key, value, value]
        );
      }
      const [rows] = await pool.query("SELECT setting_key, setting_value FROM event_settings");
      const updated = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
      return send.ok(res, { settings: updated });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── USER MANAGEMENT (delegate + admin accounts) ─────────────────────────
  // Returns a unified list of every account that can log in, marked by user_type:
  //   'delegate' → mobile app users (attendees table)
  //   'admin'    → web dashboard users (users table)
  const getUsers = async (_req, res) => {
    try {
      const [delegates] = await pool.query(`
        SELECT id, name, email, organization, job_title, ticket_type,
               registration_code, account_active,
               (password_hash IS NOT NULL) as has_password,
               photo_url, bio, linkedin, twitter, website,
               check_in_day1, check_in_day2, created_at,
               'delegate' AS user_type
        FROM attendees ORDER BY name ASC
      `);

      const [admins] = await pool.query(`
        SELECT id, email, created_at
        FROM users ORDER BY email ASC
      `);

      // Normalize admin rows to match the frontend's user shape
      const adminRows = admins.map(a => ({
        id: a.id,
        name: a.email.split("@")[0],
        email: a.email,
        organization: null,
        job_title: "Administrator",
        ticket_type: null,
        registration_code: null,
        account_active: 1,
        has_password: 1,
        photo_url: null,
        bio: null,
        linkedin: null,
        twitter: null,
        website: null,
        check_in_day1: 0,
        check_in_day2: 0,
        created_at: a.created_at,
        user_type: "admin",
      }));

      return send.ok(res, { users: [...adminRows, ...delegates] });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const setUserPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const scope = req.body?.scope === "admin" ? "admin" : "delegate";
    if (!password || password.length < 6) return send.bad(res, "Password must be at least 6 characters");
    try {
      const hash = await bcrypt.hash(password, 10);
      if (scope === "admin") {
        const [r] = await pool.query("UPDATE users SET password_hash=? WHERE id=?", [hash, id]);
        if (r.affectedRows === 0) return send.notFound(res, "Admin not found");
        return send.ok(res, { success: true, message: "Admin password updated." });
      }
      const [r] = await pool.query(
        "UPDATE attendees SET password_hash=?, account_active=TRUE WHERE id=?",
        [hash, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "User not found");
      return send.ok(res, { success: true, message: "Password set. Account is now active." });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // PUT /api/event/users/:id   body: { scope, email, name, organization, job_title, phone, ticket_type, dietary_requirements, password? }
  // Unified edit endpoint used by the refreshed user management modal.
  const updateUser = async (req, res) => {
    const { id } = req.params;
    const scope = req.body?.scope === "admin" ? "admin" : "delegate";
    const {
      email, name, organization, job_title, phone, ticket_type, dietary_requirements, password,
    } = req.body;
    try {
      if (scope === "admin") {
        if (!email) return send.bad(res, "Email is required");
        const updates = ["email=?"];
        const vals = [email];
        if (password) {
          if (password.length < 6) return send.bad(res, "Password must be at least 6 characters");
          updates.push("password_hash=?");
          vals.push(await bcrypt.hash(password, 10));
        }
        vals.push(id);
        const [r] = await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, vals);
        if (r.affectedRows === 0) return send.notFound(res, "Admin not found");
        return send.ok(res, { success: true });
      }

      // Delegate
      if (!name || !email) return send.bad(res, "Name and email are required");
      const updates = [
        "name=?", "email=?", "organization=?", "job_title=?", "phone=?",
        "ticket_type=?", "dietary_requirements=?",
      ];
      const vals = [
        name, email, organization || null, job_title || null, phone || null,
        ticket_type || "full", dietary_requirements || null,
      ];
      if (password) {
        if (password.length < 6) return send.bad(res, "Password must be at least 6 characters");
        updates.push("password_hash=?", "account_active=TRUE");
        vals.push(await bcrypt.hash(password, 10));
      }
      vals.push(id);
      const [r] = await pool.query(`UPDATE attendees SET ${updates.join(", ")} WHERE id=?`, vals);
      if (r.affectedRows === 0) return send.notFound(res, "Delegate not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error("updateUser error:", e);
      if (String(e.message).includes("Duplicate")) {
        return send.bad(res, "That email is already used by another account");
      }
      return send.serverErr(res);
    }
  };

  const toggleUserActive = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query(
        "UPDATE attendees SET account_active = NOT account_active WHERE id=?", [id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "User not found");
      const [[user]] = await pool.query(
        "SELECT id, name, email, account_active FROM attendees WHERE id=?", [id]
      );
      return send.ok(res, { user });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { bio, photo_url, linkedin, twitter, website } = req.body;
    try {
      await pool.query(
        "UPDATE attendees SET bio=?, photo_url=?, linkedin=?, twitter=?, website=? WHERE id=?",
        [bio || null, photo_url || null, linkedin || null, twitter || null, website || null, id]
      );
      const [[user]] = await pool.query("SELECT * FROM attendees WHERE id=?", [id]);
      return send.ok(res, { user });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegate login — used by mobile app
  const delegateLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return send.bad(res, "Email and password required");
    try {
      const [rows] = await pool.query(
        "SELECT * FROM attendees WHERE email=? AND account_active=TRUE", [email]
      );
      const attendee = rows[0];
      if (!attendee || !attendee.password_hash) return send.unauthorized(res, "Invalid credentials or account not activated");
      const bcrypt = await import("bcryptjs");
      const ok = await bcrypt.default.compare(password, attendee.password_hash);
      if (!ok) return send.unauthorized(res, "Invalid credentials");
      const jwt = await import("jsonwebtoken");
      const token = jwt.default.sign(
        { id: attendee.id, email: attendee.email, role: "delegate" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      const { password_hash, ...safeAttendee } = attendee;
      return send.ok(res, { token, attendee: safeAttendee });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Get own profile (delegate, from mobile app token)
  const getMyProfile = async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, email, organization, job_title, phone, ticket_type, registration_code, bio, photo_url, linkedin, twitter, website, check_in_day1, check_in_day2 FROM attendees WHERE id=?",
        [req.user.id]
      );
      if (!rows[0]) return send.notFound(res, "Profile not found");
      return send.ok(res, { profile: rows[0] });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── ATTENDEE DIRECTORY (networking) ──────────────────────────────────────
  const getDirectory = async (_req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT id, name, email, organization, job_title, ticket_type,
               bio, photo_url, linkedin, twitter, website, account_active,
               (password_hash IS NOT NULL) as has_account
        FROM attendees
        WHERE account_active = TRUE
        ORDER BY name ASC
      `);
      return send.ok(res, { attendees: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const getAttendeeProfile = async (req, res) => {
    const { id } = req.params;
    try {
      const [[attendee]] = await pool.query(`
        SELECT id, name, email, organization, job_title, ticket_type,
               bio, photo_url, linkedin, twitter, website
        FROM attendees WHERE id=?
      `, [id]);
      if (!attendee) return send.notFound(res, "Attendee not found");

      // Get their sent/received message count
      const [[{ msgCount }]] = await pool.query(
        "SELECT COUNT(*) as msgCount FROM messages WHERE sender_id=? OR receiver_id=?", [id, id]
      );
      return send.ok(res, { attendee: { ...attendee, msgCount } });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  // Role-aware: admins can pass any attendeeId (or omit for firehose); a
  // delegate token is forced to filter on its own attendee id, regardless of
  // what the client sent. Without this, any delegate could list every DM in
  // the system just by omitting the query param.
  const getMessages = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    let attendeeId = req.query.attendeeId;
    if (!isAdmin) {
      // Force delegate callers to their own id. Reject mismatched query hints
      // so a tampered client can't pretend it asked for itself.
      const selfId = String(req.user?.id || "");
      if (attendeeId && String(attendeeId) !== selfId) {
        return send.forbidden
          ? send.forbidden(res, "Can only list your own messages")
          : res.status(403).json({ error: "Can only list your own messages" });
      }
      attendeeId = selfId;
    }
    try {
      let query = `
        SELECT m.*,
          s.name as sender_name, s.organization as sender_org, s.photo_url as sender_photo,
          r.name as receiver_name, r.organization as receiver_org, r.photo_url as receiver_photo
        FROM messages m
        JOIN attendees s ON m.sender_id = s.id
        JOIN attendees r ON m.receiver_id = r.id
      `;
      const params = [];
      if (attendeeId) {
        query += " WHERE m.sender_id=? OR m.receiver_id=?";
        params.push(attendeeId, attendeeId);
      }
      query += " ORDER BY m.sent_at DESC LIMIT 200";
      const [rows] = await pool.query(query, params);
      return send.ok(res, { messages: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegates may only read a conversation they're a party to. Admins can
  // read any two attendees' thread. The mark-as-read side-effect is only
  // applied when the caller is the receiver (`a`), preventing a delegate
  // from flipping read flags on someone else's behalf.
  const getConversation = async (req, res) => {
    const { a, b } = req.query;
    if (!a || !b) return send.bad(res, "Provide attendee ids a and b");
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin) {
      const selfId = String(req.user?.id || "");
      if (String(a) !== selfId && String(b) !== selfId) {
        return res.status(403).json({ error: "Can only read your own conversations" });
      }
    }
    try {
      const [rows] = await pool.query(`
        SELECT m.*,
          s.name as sender_name, s.organization as sender_org, s.photo_url as sender_photo,
          r.name as receiver_name, r.organization as receiver_org, r.photo_url as receiver_photo
        FROM messages m
        JOIN attendees s ON m.sender_id = s.id
        JOIN attendees r ON m.receiver_id = r.id
        WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
        ORDER BY m.sent_at ASC
      `, [a, b, b, a]);
      // Only mark as read on behalf of the caller (the `a` side). Admin peeks
      // don't alter read state.
      if (!isAdmin && String(a) === String(req.user?.id)) {
        await pool.query(
          "UPDATE messages SET is_read=TRUE WHERE receiver_id=? AND sender_id=? AND is_read=FALSE",
          [a, b]
        );
      }
      return send.ok(res, { messages: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegates can only mark messages addressed to themselves as read.
  // `reader_id` from the request body is ignored for delegate callers.
  const markAsRead = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const readerId = isAdmin ? req.body.reader_id : req.user?.id;
    const { sender_id } = req.body;
    if (!readerId || !sender_id) return send.bad(res, "reader_id and sender_id are required");
    try {
      await pool.query(
        "UPDATE messages SET is_read=TRUE WHERE receiver_id=? AND sender_id=? AND is_read=FALSE",
        [readerId, sender_id]
      );
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegate sender_id is always taken from the verified JWT — the request
  // body's sender_id is ignored. Admins may impersonate (e.g. for support /
  // system-broadcast tooling) by passing sender_id explicitly. This closes
  // the "POST to /api/delegate/messages with sender_id=<anyone>" IDOR.
  const sendMessage = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const sender_id = isAdmin ? (req.body.sender_id ?? req.user?.id) : req.user?.id;
    const { receiver_id, subject, body } = req.body;
    if (!sender_id || !receiver_id || !body) return send.bad(res, "sender_id, receiver_id, body are required");
    if (String(sender_id) === String(receiver_id)) return send.bad(res, "Cannot message yourself");
    try {
      const [result] = await pool.query(
        "INSERT INTO messages (sender_id, receiver_id, subject, body) VALUES (?,?,?,?)",
        [sender_id, receiver_id, subject || null, body]
      );
      const [[message]] = await pool.query(`
        SELECT m.*,
          s.name as sender_name, s.organization as sender_org, s.photo_url as sender_photo,
          r.name as receiver_name, r.organization as receiver_org, r.photo_url as receiver_photo
        FROM messages m
        JOIN attendees s ON m.sender_id = s.id
        JOIN attendees r ON m.receiver_id = r.id
        WHERE m.id=?
      `, [result.insertId]);

      // Broadcast to both sender and receiver via WebSocket
      if (broadcastToUser) {
        broadcastToUser(sender_id, "new_message", message);
        broadcastToUser(receiver_id, "new_message", message);
      }

      return send.created(res, { message });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegates can only delete messages they're a party to; admins can
  // delete any. We look up the row first to check ownership — kept as a
  // single DELETE with an ownership predicate would race (and wouldn't
  // let us distinguish 404 from 403).
  const deleteMessage = async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";
    try {
      if (!isAdmin) {
        const [[row]] = await pool.query(
          "SELECT sender_id, receiver_id FROM messages WHERE id=?",
          [id]
        );
        if (!row) return send.notFound(res, "Message not found");
        const selfId = Number(req.user?.id);
        if (Number(row.sender_id) !== selfId && Number(row.receiver_id) !== selfId) {
          return res.status(403).json({ error: "Cannot delete another user's message" });
        }
      }
      const [r] = await pool.query("DELETE FROM messages WHERE id=?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Message not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const getMessageStats = async (_req, res) => {
    try {
      const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM messages");
      const [[{ unread }]] = await pool.query("SELECT COUNT(*) as unread FROM messages WHERE is_read=FALSE");
      const [active] = await pool.query(`
        SELECT a.id, a.name, a.photo_url, a.organization,
          COUNT(m.id) as msg_count
        FROM attendees a
        JOIN messages m ON a.id = m.sender_id OR a.id = m.receiver_id
        GROUP BY a.id ORDER BY msg_count DESC LIMIT 5
      `);
      return send.ok(res, { total, unread, active });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── CONNECTIONS ──────────────────────────────────────────────────────────
  // Delegates are locked to their own attendee id; admins can list any.
  const getConnections = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    let attendeeId = req.query.attendeeId;
    if (!isAdmin) {
      const selfId = String(req.user?.id || "");
      if (attendeeId && String(attendeeId) !== selfId) {
        return res.status(403).json({ error: "Can only list your own connections" });
      }
      attendeeId = selfId;
    }
    try {
      let query = `
        SELECT c.*,
          rq.name as requester_name, rq.organization as requester_org, rq.photo_url as requester_photo,
          rd.name as requested_name, rd.organization as requested_org, rd.photo_url as requested_photo
        FROM connections c
        JOIN attendees rq ON c.requester_id = rq.id
        JOIN attendees rd ON c.requested_id = rd.id
      `;
      const params = [];
      if (attendeeId) {
        query += " WHERE c.requester_id=? OR c.requested_id=?";
        params.push(attendeeId, attendeeId);
      }
      query += " ORDER BY c.created_at DESC";
      const [rows] = await pool.query(query, params);
      return send.ok(res, { connections: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Only the `requested` party may accept/decline a connection; neither
  // side may flip a resolved connection back to pending. Admins may set
  // any status for moderation. Previously a delegate could accept/decline
  // any connection in the system by id.
  const updateConnectionStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!["pending", "accepted", "declined"].includes(status)) return send.bad(res, "Invalid status");
    const isAdmin = req.user?.role === "admin";
    try {
      const [[conn]] = await pool.query(
        "SELECT id, requester_id, requested_id, status FROM connections WHERE id=?",
        [id]
      );
      if (!conn) return send.notFound(res, "Connection not found");

      if (!isAdmin) {
        const selfId = Number(req.user?.id);
        const isRequester = Number(conn.requester_id) === selfId;
        const isRequested = Number(conn.requested_id) === selfId;
        if (!isRequester && !isRequested) {
          return res.status(403).json({ error: "Not a party to this connection" });
        }
        // Only the invitee can accept/decline.
        if ((status === "accepted" || status === "declined") && !isRequested) {
          return res.status(403).json({ error: "Only the invited user can accept or decline" });
        }
      }

      await pool.query("UPDATE connections SET status=? WHERE id=?", [status, id]);
      const [[updated]] = await pool.query("SELECT * FROM connections WHERE id=?", [id]);
      return send.ok(res, { connection: updated });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── CREATE CONNECTION ───────────────────────────────────────────────────
  // Delegate requester_id is forced to the token id. Admins can create a
  // connection on behalf of any pair (useful for seeding / testing).
  const createConnection = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const requester_id = isAdmin ? (req.body.requester_id ?? req.user?.id) : req.user?.id;
    const { requested_id } = req.body;
    if (!requester_id || !requested_id) return send.bad(res, "Both requester_id and requested_id required");
    if (String(requester_id) === String(requested_id)) return send.bad(res, "Cannot connect with yourself");
    try {
      // Check both attendees exist
      const [[rq]] = await pool.query("SELECT id FROM attendees WHERE id=?", [requester_id]);
      const [[rd]] = await pool.query("SELECT id FROM attendees WHERE id=?", [requested_id]);
      if (!rq || !rd) return send.notFound(res, "One or both attendees not found");
      // Check for existing connection in either direction
      const [existing] = await pool.query(
        "SELECT id FROM connections WHERE (requester_id=? AND requested_id=?) OR (requester_id=? AND requested_id=?)",
        [requester_id, requested_id, requested_id, requester_id]
      );
      if (existing.length > 0) return send.bad(res, "Connection already exists");
      const [r] = await pool.query("INSERT INTO connections (requester_id, requested_id) VALUES (?,?)", [requester_id, requested_id]);
      const [[conn]] = await pool.query(`
        SELECT c.*, rq.name as requester_name, rq.organization as requester_org, rq.photo_url as requester_photo,
          rd.name as requested_name, rd.organization as requested_org, rd.photo_url as requested_photo
        FROM connections c
        JOIN attendees rq ON c.requester_id = rq.id
        JOIN attendees rd ON c.requested_id = rd.id
        WHERE c.id=?
      `, [r.insertId]);
      return send.created(res, { connection: conn });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── DELETE CONNECTION ──────────────────────────────────────────────────
  // Delegates can only delete a connection they're a party to. Admins may
  // delete any connection.
  const deleteConnection = async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";
    try {
      if (!isAdmin) {
        const [[row]] = await pool.query(
          "SELECT requester_id, requested_id FROM connections WHERE id=?",
          [id]
        );
        if (!row) return send.notFound(res, "Connection not found");
        const selfId = Number(req.user?.id);
        if (Number(row.requester_id) !== selfId && Number(row.requested_id) !== selfId) {
          return res.status(403).json({ error: "Not a party to this connection" });
        }
      }
      const [r] = await pool.query("DELETE FROM connections WHERE id=?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Connection not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── NETWORKING STATS ───────────────────────────────────────────────────
  const getNetworkingStats = async (_req, res) => {
    try {
      const [[{ totalConnections }]] = await pool.query("SELECT COUNT(*) as totalConnections FROM connections");
      const [[{ pending }]] = await pool.query("SELECT COUNT(*) as pending FROM connections WHERE status='pending'");
      const [[{ accepted }]] = await pool.query("SELECT COUNT(*) as accepted FROM connections WHERE status='accepted'");
      const [[{ declined }]] = await pool.query("SELECT COUNT(*) as declined FROM connections WHERE status='declined'");
      const [[{ totalMessages }]] = await pool.query("SELECT COUNT(*) as totalMessages FROM messages");
      const [[{ unreadMessages }]] = await pool.query("SELECT COUNT(*) as unreadMessages FROM messages WHERE is_read=FALSE");
      const [[{ totalMeetings }]] = await pool.query("SELECT COUNT(*) as totalMeetings FROM meetings");
      const [[{ pendingMeetings }]] = await pool.query("SELECT COUNT(*) as pendingMeetings FROM meetings WHERE status='pending'");
      const [[{ acceptedMeetings }]] = await pool.query("SELECT COUNT(*) as acceptedMeetings FROM meetings WHERE status='accepted'");

      // Most connected attendees (top 5)
      const [mostConnected] = await pool.query(`
        SELECT a.id, a.name, a.photo_url, a.organization, COUNT(*) as conn_count
        FROM attendees a
        JOIN (
          SELECT requester_id as aid FROM connections WHERE status='accepted'
          UNION ALL
          SELECT requested_id as aid FROM connections WHERE status='accepted'
        ) c ON a.id = c.aid
        GROUP BY a.id ORDER BY conn_count DESC LIMIT 5
      `);

      // Most active chatters (top 5)
      const [activeChatters] = await pool.query(`
        SELECT a.id, a.name, a.photo_url, a.organization, COUNT(*) as msg_count
        FROM attendees a
        JOIN messages m ON a.id = m.sender_id
        GROUP BY a.id ORDER BY msg_count DESC LIMIT 5
      `);

      // Recent activity (last 10 connections + last 10 messages)
      const [recentConnections] = await pool.query(`
        SELECT 'connection' as activity_type, c.id, c.status, c.created_at,
          rq.name as from_name, rq.photo_url as from_photo, rq.organization as from_org,
          rd.name as to_name, rd.photo_url as to_photo, rd.organization as to_org
        FROM connections c
        JOIN attendees rq ON c.requester_id = rq.id
        JOIN attendees rd ON c.requested_id = rd.id
        ORDER BY c.created_at DESC LIMIT 10
      `);
      const [recentMessages] = await pool.query(`
        SELECT 'message' as activity_type, m.id, m.subject, m.sent_at as created_at,
          s.name as from_name, s.photo_url as from_photo, s.organization as from_org,
          r.name as to_name, r.photo_url as to_photo, r.organization as to_org
        FROM messages m
        JOIN attendees s ON m.sender_id = s.id
        JOIN attendees r ON m.receiver_id = r.id
        ORDER BY m.sent_at DESC LIMIT 10
      `);

      const recentActivity = [...recentConnections, ...recentMessages]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 15);

      return send.ok(res, {
        connections: { total: totalConnections, pending, accepted, declined },
        messages: { total: totalMessages, unread: unreadMessages },
        meetings: { total: totalMeetings, pending: pendingMeetings, accepted: acceptedMeetings },
        mostConnected,
        activeChatters,
        recentActivity,
      });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── MEETINGS CRUD ──────────────────────────────────────────────────────
  // Delegates are locked to meetings they're a party to; admins see all.
  const getMeetings = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    let attendeeId = req.query.attendeeId;
    if (!isAdmin) {
      const selfId = String(req.user?.id || "");
      if (attendeeId && String(attendeeId) !== selfId) {
        return res.status(403).json({ error: "Can only list your own meetings" });
      }
      attendeeId = selfId;
    }
    try {
      let query = `
        SELECT mt.*,
          rq.name as requester_name, rq.organization as requester_org, rq.photo_url as requester_photo, rq.job_title as requester_title,
          rd.name as requested_name, rd.organization as requested_org, rd.photo_url as requested_photo, rd.job_title as requested_title
        FROM meetings mt
        JOIN attendees rq ON mt.requester_id = rq.id
        JOIN attendees rd ON mt.requested_id = rd.id
      `;
      const params = [];
      if (attendeeId) {
        query += " WHERE mt.requester_id=? OR mt.requested_id=?";
        params.push(attendeeId, attendeeId);
      }
      query += " ORDER BY mt.meeting_date ASC, mt.start_time ASC";
      const [rows] = await pool.query(query, params);
      return send.ok(res, { meetings: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegate requester_id forced to the token id. Admins can create on
  // behalf of any attendee (moderation / support).
  const createMeeting = async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const requester_id = isAdmin ? (req.body.requester_id ?? req.user?.id) : req.user?.id;
    const { requested_id, title, meeting_date, start_time, end_time, location, notes } = req.body;
    if (!requester_id || !requested_id) return send.bad(res, "Both requester_id and requested_id required");
    if (String(requester_id) === String(requested_id)) return send.bad(res, "Cannot schedule a meeting with yourself");
    try {
      const [r] = await pool.query(
        "INSERT INTO meetings (requester_id, requested_id, title, meeting_date, start_time, end_time, location, notes) VALUES (?,?,?,?,?,?,?,?)",
        [requester_id, requested_id, title || null, meeting_date || null, start_time || null, end_time || null, location || null, notes || null]
      );
      const [[meeting]] = await pool.query(`
        SELECT mt.*,
          rq.name as requester_name, rq.organization as requester_org, rq.photo_url as requester_photo,
          rd.name as requested_name, rd.organization as requested_org, rd.photo_url as requested_photo
        FROM meetings mt
        JOIN attendees rq ON mt.requester_id = rq.id
        JOIN attendees rd ON mt.requested_id = rd.id
        WHERE mt.id=?
      `, [r.insertId]);
      return send.created(res, { meeting });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegates may only update meetings they're a party to. Admins may
  // update any meeting. Previously the id alone let anyone mutate any row.
  const updateMeeting = async (req, res) => {
    const { id } = req.params;
    const { title, meeting_date, start_time, end_time, location, notes, status } = req.body;
    if (status && !["pending", "accepted", "declined", "cancelled"].includes(status)) return send.bad(res, "Invalid status");
    const isAdmin = req.user?.role === "admin";
    try {
      if (!isAdmin) {
        const [[row]] = await pool.query(
          "SELECT requester_id, requested_id FROM meetings WHERE id=?",
          [id]
        );
        if (!row) return send.notFound(res, "Meeting not found");
        const selfId = Number(req.user?.id);
        if (Number(row.requester_id) !== selfId && Number(row.requested_id) !== selfId) {
          return res.status(403).json({ error: "Not a party to this meeting" });
        }
      }
      const fields = [];
      const params = [];
      if (title !== undefined) { fields.push("title=?"); params.push(title); }
      if (meeting_date !== undefined) { fields.push("meeting_date=?"); params.push(meeting_date); }
      if (start_time !== undefined) { fields.push("start_time=?"); params.push(start_time); }
      if (end_time !== undefined) { fields.push("end_time=?"); params.push(end_time); }
      if (location !== undefined) { fields.push("location=?"); params.push(location); }
      if (notes !== undefined) { fields.push("notes=?"); params.push(notes); }
      if (status !== undefined) { fields.push("status=?"); params.push(status); }
      if (fields.length === 0) return send.bad(res, "No fields to update");
      params.push(id);
      const [r] = await pool.query(`UPDATE meetings SET ${fields.join(",")} WHERE id=?`, params);
      if (r.affectedRows === 0) return send.notFound(res, "Meeting not found");
      const [[meeting]] = await pool.query(`
        SELECT mt.*,
          rq.name as requester_name, rq.organization as requester_org, rq.photo_url as requester_photo,
          rd.name as requested_name, rd.organization as requested_org, rd.photo_url as requested_photo
        FROM meetings mt
        JOIN attendees rq ON mt.requester_id = rq.id
        JOIN attendees rd ON mt.requested_id = rd.id
        WHERE mt.id=?
      `, [id]);
      return send.ok(res, { meeting });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Delegates may only delete meetings they're a party to; admins any.
  const deleteMeeting = async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";
    try {
      if (!isAdmin) {
        const [[row]] = await pool.query(
          "SELECT requester_id, requested_id FROM meetings WHERE id=?",
          [id]
        );
        if (!row) return send.notFound(res, "Meeting not found");
        const selfId = Number(req.user?.id);
        if (Number(row.requester_id) !== selfId && Number(row.requested_id) !== selfId) {
          return res.status(403).json({ error: "Not a party to this meeting" });
        }
      }
      const [r] = await pool.query("DELETE FROM meetings WHERE id=?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Meeting not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── PROJECTS ──────────────────────────────────────────────────────────────
  const getProjects = async (_req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT p.*, COUNT(v.id) AS vote_count
        FROM projects p
        LEFT JOIN votes v ON p.id = v.project_id
        GROUP BY p.id
        ORDER BY p.display_order ASC, p.created_at ASC
      `);
      return send.ok(res, { projects: rows });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const createProject = async (req, res) => {
    const { name, description, team, image_url, category, display_order } = req.body;
    if (!name) return send.bad(res, "Project name is required");
    try {
      const [result] = await pool.query(
        "INSERT INTO projects (name, description, team, image_url, category, display_order) VALUES (?, ?, ?, ?, ?, ?)",
        [name, description || null, team || null, image_url || null, category || null, display_order || 0]
      );
      const [[project]] = await pool.query("SELECT * FROM projects WHERE id=?", [result.insertId]);
      return send.created(res, { project });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const updateProject = async (req, res) => {
    const { id } = req.params;
    const { name, description, team, image_url, category, display_order } = req.body;
    if (!name) return send.bad(res, "Project name is required");
    try {
      const [r] = await pool.query(
        "UPDATE projects SET name=?, description=?, team=?, image_url=?, category=?, display_order=? WHERE id=?",
        [name, description || null, team || null, image_url || null, category || null, display_order || 0, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Project not found");
      const [[project]] = await pool.query("SELECT * FROM projects WHERE id=?", [id]);
      return send.ok(res, { project });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query("DELETE FROM projects WHERE id=?", [id]);
      if (r.affectedRows === 0) return send.notFound(res, "Project not found");
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── VOTING (Admin) ──────────────────────────────────────────────────────
  const getVoteResults = async (_req, res) => {
    try {
      const [projects] = await pool.query(`
        SELECT p.*, COUNT(v.id) AS vote_count
        FROM projects p
        LEFT JOIN votes v ON p.id = v.project_id
        GROUP BY p.id
        ORDER BY vote_count DESC, p.display_order ASC
      `);
      const [[{ totalVotes }]] = await pool.query("SELECT COUNT(*) as totalVotes FROM votes");
      const [[{ totalDelegates }]] = await pool.query("SELECT COUNT(*) as totalDelegates FROM attendees WHERE account_active=TRUE AND password_hash IS NOT NULL");
      const [flagRows] = await pool.query(
        "SELECT setting_key, setting_value FROM event_settings WHERE setting_key IN ('voting_open','voting_results_visible')"
      );
      const flags = Object.fromEntries(flagRows.map(r => [r.setting_key, r.setting_value]));
      const votingOpen = flags.voting_open === "true";
      const votingResultsVisible = flags.voting_results_visible === "true";
      return send.ok(res, { projects, totalVotes, totalDelegates, votingOpen, votingResultsVisible });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const getVoteDetails = async (req, res) => {
    const { projectId } = req.params;
    try {
      const [voters] = await pool.query(`
        SELECT a.id, a.name, a.email, a.organization, v.created_at AS voted_at
        FROM votes v JOIN attendees a ON v.attendee_id = a.id
        WHERE v.project_id = ?
        ORDER BY v.created_at DESC
      `, [projectId]);
      return send.ok(res, { voters });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const toggleVoting = async (req, res) => {
    const { open } = req.body;
    try {
      await pool.query(
        "INSERT INTO event_settings (setting_key, setting_value) VALUES ('voting_open', ?) ON DUPLICATE KEY UPDATE setting_value=?",
        [String(open), String(open)]
      );
      // Push the flip to every delegate so their UI updates without refresh.
      if (broadcastAll) {
        broadcastAll("voting_open_changed", { voting_open: !!open });
      }
      return send.ok(res, { votingOpen: open });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Toggle whether vote tallies are visible to delegates. When hidden,
  // delegates still see the project list and their own vote, but every
  // project's vote_count is reported as 0 and total/leaderboard UI is
  // suppressed on the mobile side. The admin leaderboard is unaffected.
  const toggleVotingResults = async (req, res) => {
    const { visible } = req.body;
    try {
      await pool.query(
        "INSERT INTO event_settings (setting_key, setting_value) VALUES ('voting_results_visible', ?) ON DUPLICATE KEY UPDATE setting_value=?",
        [String(visible), String(visible)]
      );
      if (broadcastAll) {
        broadcastAll("voting_results_visibility_changed", { voting_results_visible: !!visible });
      }
      return send.ok(res, { votingResultsVisible: !!visible });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── PROJECTS & VOTING (Delegate) ────────────────────────────────────────
  const getDelegateProjects = async (req, res) => {
    const attendeeId = req.user.id;
    try {
      const [rows] = await pool.query(`
        SELECT p.*, COUNT(v.id) AS vote_count,
          MAX(CASE WHEN v.attendee_id = ? THEN 1 ELSE 0 END) AS voted_for_this
        FROM projects p
        LEFT JOIN votes v ON p.id = v.project_id
        GROUP BY p.id
        ORDER BY p.display_order ASC, p.created_at ASC
      `, [attendeeId]);
      const [myVoteRow] = await pool.query("SELECT project_id FROM votes WHERE attendee_id=?", [attendeeId]);
      const has_voted = myVoteRow.length > 0;
      const my_vote_project_id = has_voted ? myVoteRow[0].project_id : null;

      // Read both voting flags in one round-trip.
      const [flagRows] = await pool.query(
        "SELECT setting_key, setting_value FROM event_settings WHERE setting_key IN ('voting_open','voting_results_visible')"
      );
      const flags = Object.fromEntries(flagRows.map(r => [r.setting_key, r.setting_value]));
      const voting_open = flags.voting_open === "true";
      // Hidden by default so results are private until admin explicitly
      // opens them — matches the user's request.
      const voting_results_visible = flags.voting_results_visible === "true";

      // Scrub vote counts when results aren't supposed to be visible.
      // Delegate can still see `voted_for_this` (their own vote) so the
      // "You voted for X" confirmation in the mobile app keeps working.
      const projects = voting_results_visible
        ? rows
        : rows.map(p => ({ ...p, vote_count: 0 }));

      return send.ok(res, {
        projects, has_voted, my_vote_project_id,
        voting_open, voting_results_visible,
      });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const castVote = async (req, res) => {
    const attendeeId = req.user.id;
    const { project_id } = req.body;
    if (!project_id) return send.bad(res, "project_id is required");
    try {
      const [settingRow] = await pool.query("SELECT setting_value FROM event_settings WHERE setting_key='voting_open'");
      const votingOpen = settingRow.length > 0 && settingRow[0].setting_value === "true";
      if (!votingOpen) return send.bad(res, "Voting is not currently open");
      const [[project]] = await pool.query("SELECT id FROM projects WHERE id=?", [project_id]);
      if (!project) return send.notFound(res, "Project not found");
      await pool.query(
        "INSERT INTO votes (project_id, attendee_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE project_id=?",
        [project_id, attendeeId, project_id]
      );
      return send.ok(res, { success: true, project_id });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const removeVote = async (req, res) => {
    const attendeeId = req.user.id;
    try {
      const [settingRow] = await pool.query("SELECT setting_value FROM event_settings WHERE setting_key='voting_open'");
      const votingOpen = settingRow.length > 0 && settingRow[0].setting_value === "true";
      if (!votingOpen) return send.bad(res, "Voting is not currently open");
      await pool.query("DELETE FROM votes WHERE attendee_id=?", [attendeeId]);
      return send.ok(res, { success: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Update getStats to include new counts
  const getStatsNew = async (_req, res) => {
    try {
      const [[{ speakers }]] = await pool.query("SELECT COUNT(*) as speakers FROM speakers");
      const [[{ sessions }]] = await pool.query("SELECT COUNT(*) as sessions FROM sessions");
      const [[{ sponsors }]] = await pool.query("SELECT COUNT(*) as sponsors FROM sponsors");
      const [[{ attendees }]] = await pool.query("SELECT COUNT(*) as attendees FROM attendees");
      const [[{ announcements }]] = await pool.query("SELECT COUNT(*) as announcements FROM announcements WHERE published = TRUE");
      const [[{ networking }]] = await pool.query("SELECT COUNT(*) as networking FROM networking_slots");
      const [[{ checkedIn }]] = await pool.query("SELECT COUNT(*) as checkedIn FROM attendees WHERE check_in_day1 = TRUE OR check_in_day2 = TRUE");
      const [[{ activeUsers }]] = await pool.query("SELECT COUNT(*) as activeUsers FROM attendees WHERE password_hash IS NOT NULL AND account_active = TRUE");
      const [[{ messages }]] = await pool.query("SELECT COUNT(*) as messages FROM messages");
      const [[{ unread }]] = await pool.query("SELECT COUNT(*) as unread FROM messages WHERE is_read=FALSE");
      const [[{ projects }]] = await pool.query("SELECT COUNT(*) as projects FROM projects");
      const [[{ totalVotes }]] = await pool.query("SELECT COUNT(*) as totalVotes FROM votes");
      return send.ok(res, { speakers, sessions, sponsors, attendees, announcements, networking, checkedIn, activeUsers, messages, unread, projects, totalVotes });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── EMAIL: ONBOARDING & PASSWORD RESET ─────────────────────────────────
  // Works for both admins (users table) and delegates (attendees table).
  // Requires ?type=admin|delegate in the request body or params.

  async function loadUser(scope, id) {
    if (scope === "admin") {
      const [rows] = await pool.query("SELECT id, email FROM users WHERE id=?", [id]);
      if (!rows[0]) return null;
      return { id: rows[0].id, email: rows[0].email, firstName: rows[0].email.split("@")[0] };
    }
    const [rows] = await pool.query("SELECT id, email, name FROM attendees WHERE id=?", [id]);
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, firstName: (rows[0].name || "").split(" ")[0] };
  }

  // POST /api/event/users/:id/send-onboarding  body: { scope: 'admin'|'delegate' }
  const sendUserOnboarding = async (req, res) => {
    const { id } = req.params;
    const scope = req.body?.scope === "admin" ? "admin" : "delegate";
    try {
      const user = await loadUser(scope, id);
      if (!user) return send.notFound(res, "User not found");

      const token = generateResetToken();
      await storeResetToken(pool, { scope, userId: id, token });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      await sendEmail(pool, {
        to: user.email,
        subject: scope === "admin"
          ? "FICA Congress Admin — Set up your account"
          : "Welcome to FICA Congress 2026 — Set up your account",
        html: onboardingEmail({
          firstName: user.firstName,
          email: user.email,
          resetLink,
          accountType: scope,
        }),
      });

      return send.ok(res, { success: true, message: `Onboarding email sent to ${user.email}` });
    } catch (e) {
      console.error("sendUserOnboarding error:", e);
      return send.bad(res, e.message || "Failed to send onboarding email");
    }
  };

  // POST /api/event/users/:id/send-reset  body: { scope: 'admin'|'delegate' }
  const sendUserResetPassword = async (req, res) => {
    const { id } = req.params;
    const scope = req.body?.scope === "admin" ? "admin" : "delegate";
    try {
      const user = await loadUser(scope, id);
      if (!user) return send.notFound(res, "User not found");

      const token = generateResetToken();
      await storeResetToken(pool, { scope, userId: id, token });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      await sendEmail(pool, {
        to: user.email,
        subject: "FICA Congress — Password Reset",
        html: resetPasswordEmail({
          firstName: user.firstName,
          resetLink,
        }),
      });

      return send.ok(res, { success: true, message: `Reset email sent to ${user.email}` });
    } catch (e) {
      console.error("sendUserResetPassword error:", e);
      return send.bad(res, e.message || "Failed to send reset email");
    }
  };

  // POST /api/reset-password  body: { token, password }   (PUBLIC endpoint)
  const consumeResetToken = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return send.bad(res, "Token and password are required");
    if (password.length < 6) return send.bad(res, "Password must be at least 6 characters");
    try {
      const { scope, userId } = await validateResetToken(pool, token);
      const hash = await bcrypt.hash(password, 10);

      if (scope === "admin") {
        await pool.query("UPDATE users SET password_hash=? WHERE id=?", [hash, userId]);
      } else {
        await pool.query(
          "UPDATE attendees SET password_hash=?, account_active=TRUE WHERE id=?",
          [hash, userId]
        );
      }
      return send.ok(res, { success: true, message: "Password updated successfully" });
    } catch (e) {
      return send.bad(res, e.message);
    }
  };

  // DELETE /api/event/users/:id  body: { scope: 'admin'|'delegate' }
  const deleteUser = async (req, res) => {
    const { id } = req.params;
    const scope = req.body?.scope === "admin" ? "admin" : "delegate";
    try {
      if (scope === "admin") {
        // Prevent deleting the last admin — lockout guard
        const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM users");
        if (count <= 1) {
          return send.bad(res, "Cannot delete the last admin. Create another admin first.");
        }
        const [r] = await pool.query("DELETE FROM users WHERE id=?", [id]);
        if (r.affectedRows === 0) return send.notFound(res, "Admin not found");
      } else {
        const [r] = await pool.query("DELETE FROM attendees WHERE id=?", [id]);
        if (r.affectedRows === 0) return send.notFound(res, "Delegate not found");
      }
      // Clean up any pending reset tokens for this user
      await pool.query(
        "DELETE FROM event_settings WHERE setting_key = ?",
        [`reset_token_${scope}_${id}`]
      );
      return send.ok(res, { success: true, message: "Account deleted" });
    } catch (e) {
      console.error("deleteUser error:", e);
      return send.serverErr(res);
    }
  };

  // POST /api/event/settings/test-smtp  body: { to }
  const sendTestSmtp = async (req, res) => {
    const { to } = req.body || {};
    if (!to) return send.bad(res, "Recipient email required");
    try {
      await sendEmail(pool, {
        to,
        subject: "FICA Congress — SMTP Test Email",
        html: testEmail(),
      });
      return send.ok(res, { success: true, message: `Test email sent to ${to}` });
    } catch (e) {
      console.error("sendTestSmtp error:", e);
      return send.bad(res, e.message || "Failed to send test email");
    }
  };

  // ─── PANEL DISCUSSION (Delegate) ─────────────────────────────────────────
  // Lists every session with type='panel' for the given congress year.
  // Each panel now carries its own `discussion_enabled` flag (per-panel
  // open/close) so the admin can run multiple panels and toggle each one
  // independently.
  const getPanels = async (req, res) => {
    const attendeeId = req.user.id;
    const year = req.query.year ? parseInt(req.query.year) : null;
    try {
      const params = [attendeeId];
      let sql = `
        SELECT
          s.*,
          DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
          sp.name AS speaker_name,
          sp.title AS speaker_title,
          sp.organization AS speaker_org,
          sp.photo_url AS speaker_photo,
          (SELECT COUNT(*) FROM panel_questions pq WHERE pq.session_id = s.id) AS question_count,
          (SELECT 1 FROM panel_members pm WHERE pm.session_id = s.id AND pm.attendee_id = ? LIMIT 1) AS is_panel_member
        FROM sessions s
        LEFT JOIN speakers sp ON s.speaker_id = sp.id
        WHERE s.type = 'panel'
      `;
      if (year) { sql += " AND s.congress_year = ?"; params.push(year); }
      sql += " ORDER BY s.session_date ASC, s.start_time ASC";
      const [rows] = await pool.query(sql, params);
      // Coerce the correlated subquery result (null vs 1) into a plain 0/1,
      // and the TINYINT discussion_enabled into a real boolean.
      const panels = rows.map(r => ({
        ...r,
        is_panel_member: r.is_panel_member ? 1 : 0,
        discussion_enabled: r.discussion_enabled == null ? true : Boolean(r.discussion_enabled),
      }));
      // panel_discussion_enabled is kept in the response as a convenience
      // master-switch that's always true now — individual panels are gated
      // through their own `discussion_enabled` field instead. Existing mobile
      // builds that read the master flag continue to work unchanged.
      return send.ok(res, { panels, panel_discussion_enabled: true });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // List all questions on a panel, newest first. Each row is joined with the
  // asker's attendee record so the mobile card can show name + org + "Panel
  // Member" chip without a second lookup.
  const getPanelQuestions = async (req, res) => {
    const { id } = req.params;
    try {
      const [[panel]] = await pool.query("SELECT id FROM sessions WHERE id=? AND type='panel'", [id]);
      if (!panel) return send.notFound(res, "Panel not found");
      const [rows] = await pool.query(`
        SELECT
          pq.id,
          pq.session_id,
          pq.attendee_id,
          pq.question,
          pq.created_at,
          a.name AS attendee_name,
          a.organization AS attendee_org,
          a.photo_url AS attendee_photo,
          (SELECT 1 FROM panel_members pm WHERE pm.session_id = pq.session_id AND pm.attendee_id = pq.attendee_id LIMIT 1) AS is_panel_member
        FROM panel_questions pq
        JOIN attendees a ON a.id = pq.attendee_id
        WHERE pq.session_id = ?
        ORDER BY pq.created_at DESC
      `, [id]);
      const questions = rows.map(r => ({ ...r, is_panel_member: r.is_panel_member ? 1 : 0 }));
      return send.ok(res, { questions });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Post a new question. Gated by the per-panel `discussion_enabled` flag
  // so each panel can be independently opened/closed by admins.
  const postPanelQuestion = async (req, res) => {
    const attendeeId = req.user.id;
    const { id } = req.params;
    const question = (req.body?.question || "").trim();
    if (!question) return send.bad(res, "Question is required");
    if (question.length > 1000) return send.bad(res, "Question is too long (max 1000 characters)");
    try {
      const [[panel]] = await pool.query(
        "SELECT id, discussion_enabled FROM sessions WHERE id=? AND type='panel'",
        [id]
      );
      if (!panel) return send.notFound(res, "Panel not found");
      // discussion_enabled is TINYINT(1) in MySQL; treat null as open so
      // pre-existing panel rows default to open until the admin closes them.
      const enabled = panel.discussion_enabled == null ? true : Boolean(panel.discussion_enabled);
      if (!enabled) return send.bad(res, "This panel's discussion is currently closed");
      const [result] = await pool.query(
        "INSERT INTO panel_questions (session_id, attendee_id, question) VALUES (?, ?, ?)",
        [id, attendeeId, question]
      );
      // Echo back the inserted row enriched the same way getPanelQuestions
      // returns it, so the client can append without re-fetching the list.
      const [[inserted]] = await pool.query(`
        SELECT
          pq.id, pq.session_id, pq.attendee_id, pq.question, pq.created_at,
          a.name AS attendee_name, a.organization AS attendee_org, a.photo_url AS attendee_photo,
          (SELECT 1 FROM panel_members pm WHERE pm.session_id = pq.session_id AND pm.attendee_id = pq.attendee_id LIMIT 1) AS is_panel_member
        FROM panel_questions pq
        JOIN attendees a ON a.id = pq.attendee_id
        WHERE pq.id = ?
      `, [result.insertId]);
      inserted.is_panel_member = inserted.is_panel_member ? 1 : 0;
      return send.created(res, { question: inserted });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // ─── PANEL DISCUSSION (Admin) ────────────────────────────────────────────
  // Panel member assignment — simple set-replacement API. Admin sends the
  // desired full list of attendee IDs for a panel; we wipe + reinsert inside
  // a transaction so the picker modal can "save" as a single action.
  const getPanelMembers = async (req, res) => {
    const { sessionId } = req.params;
    try {
      const [rows] = await pool.query("SELECT attendee_id FROM panel_members WHERE session_id=?", [sessionId]);
      return send.ok(res, { member_ids: rows.map(r => r.attendee_id) });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  const setPanelMembers = async (req, res) => {
    const { sessionId } = req.params;
    const attendeeIds = Array.isArray(req.body?.attendee_ids) ? req.body.attendee_ids : null;
    if (!attendeeIds) return send.bad(res, "attendee_ids array is required");
    const conn = await pool.getConnection();
    try {
      const [[panel]] = await conn.query("SELECT id FROM sessions WHERE id=? AND type='panel'", [sessionId]);
      if (!panel) { conn.release(); return send.notFound(res, "Panel not found"); }
      await conn.beginTransaction();
      await conn.query("DELETE FROM panel_members WHERE session_id=?", [sessionId]);
      if (attendeeIds.length > 0) {
        const values = attendeeIds.map(() => "(?, ?)").join(", ");
        const params = attendeeIds.flatMap(id => [sessionId, id]);
        await conn.query(`INSERT INTO panel_members (session_id, attendee_id) VALUES ${values}`, params);
      }
      await conn.commit();
      return send.ok(res, { member_ids: attendeeIds });
    } catch (e) {
      await conn.rollback();
      console.error(e);
      return send.serverErr(res);
    } finally {
      conn.release();
    }
  };

  // Admin-facing list of every panel session for the dedicated "Panels"
  // admin page. Includes question count, member count, and the per-panel
  // discussion_enabled flag — everything needed to render the row-per-panel
  // list with toggles and "manage members" buttons.
  const getAdminPanels = async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year) : null;
    try {
      const params = [];
      let sql = `
        SELECT
          s.*,
          DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
          sp.name AS speaker_name,
          sp.title AS speaker_title,
          sp.organization AS speaker_org,
          (SELECT COUNT(*) FROM panel_questions pq WHERE pq.session_id = s.id) AS question_count,
          (SELECT COUNT(*) FROM panel_members pm WHERE pm.session_id = s.id) AS member_count
        FROM sessions s
        LEFT JOIN speakers sp ON s.speaker_id = sp.id
        WHERE s.type = 'panel'
      `;
      if (year) { sql += " AND s.congress_year = ?"; params.push(year); }
      sql += " ORDER BY s.session_date ASC, s.start_time ASC";
      const [rows] = await pool.query(sql, params);
      const panels = rows.map(r => ({
        ...r,
        discussion_enabled: r.discussion_enabled == null ? true : Boolean(r.discussion_enabled),
      }));
      return send.ok(res, { panels });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  // Flip a single panel's discussion open/closed. Body: { enabled: bool }.
  // Broadcasts the change to every connected WS client so any delegate
  // currently on the Panels list or a detail screen gets the flip pushed
  // live — no pull-to-refresh needed.
  const togglePanelDiscussion = async (req, res) => {
    const { id } = req.params;
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") return send.bad(res, "enabled (boolean) is required");
    try {
      const [r] = await pool.query(
        "UPDATE sessions SET discussion_enabled=? WHERE id=? AND type='panel'",
        [enabled ? 1 : 0, id]
      );
      if (r.affectedRows === 0) return send.notFound(res, "Panel not found");
      if (broadcastAll) {
        broadcastAll("panel_discussion_changed", {
          session_id: parseInt(id),
          discussion_enabled: enabled,
        });
      }
      return send.ok(res, { id: parseInt(id), discussion_enabled: enabled });
    } catch (e) {
      console.error(e);
      return send.serverErr(res);
    }
  };

  return {
    getStats: getStatsNew,
    getSpeakers, createSpeaker, updateSpeaker, deleteSpeaker,
    getSessions, createSession, updateSession, deleteSession,
    getSponsors, createSponsor, updateSponsor, deleteSponsor,
    getNetworking, createNetworking, updateNetworking, deleteNetworking,
    getAttendees, createAttendee, updateAttendee, deleteAttendee, checkInAttendee,
    getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
    getSettings, updateSettings,
    // User management
    getUsers, setUserPassword, toggleUserActive, updateUserProfile, updateUser,
    delegateLogin, getMyProfile,
    // Email / account recovery
    sendUserOnboarding, sendUserResetPassword, consumeResetToken, sendTestSmtp,
    deleteUser,
    // Directory & networking
    getDirectory, getAttendeeProfile,
    // Messaging
    getMessages, getConversation, sendMessage, markAsRead, deleteMessage, getMessageStats,
    // Connections
    getConnections, createConnection, deleteConnection, updateConnectionStatus,
    // Networking stats
    getNetworkingStats,
    // Meetings
    getMeetings, createMeeting, updateMeeting, deleteMeeting,
    // Projects & Voting
    getProjects, createProject, updateProject, deleteProject,
    getVoteResults, getVoteDetails, toggleVoting, toggleVotingResults,
    getDelegateProjects, castVote, removeVote,
    // Panel Discussion
    getPanels, getPanelQuestions, postPanelQuestion,
    getPanelMembers, setPanelMembers,
    getAdminPanels, togglePanelDiscussion,
  };
}
