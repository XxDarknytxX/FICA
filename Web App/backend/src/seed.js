// src/seed.js — FICA Congress data: 2025 (historical) + 2026 (current from official programme)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { getPool } from "./config/db.js";
import { initEventTables } from "./controllers/eventController.js";

async function seed() {
  const pool = await getPool();
  await initEventTables(pool);

  // ─── Admin User ──────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const passwordHash = await bcrypt.hash("admin123", 10);
  // Keep exactly one admin — wipe any others that prior seeds created
  await pool.query("DELETE FROM users WHERE email != ?", ["admin@fica.com"]);
  await pool.query(
    "INSERT INTO users (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = ?",
    ["admin@fica.com", passwordHash, passwordHash]
  );
  console.log("✓ Admin user seeded (admin@fica.com / admin123)");

  // ─── Clear existing event data ───────────────────────────────────────────
  await pool.query("UPDATE sessions SET speaker_id = NULL WHERE speaker_id IS NOT NULL");
  await pool.query("DELETE FROM sessions");
  await pool.query("DELETE FROM speakers");
  await pool.query("DELETE FROM sponsors");
  await pool.query("DELETE FROM networking_slots");

  // ═══════════════════════════════════════════════════════════════════════════
  // CONGRESS 2025 — Historical data (Shaping Fiji for Tomorrow's Challenges)
  // Venue: Baravi Ballroom at Crowne Plaza Fiji Nadi Bay Resort & Spa
  // Dates: Friday 6 – Saturday 7 June 2025
  // ═══════════════════════════════════════════════════════════════════════════

  await pool.query(`
    INSERT INTO speakers (name, title, organization, bio, photo_url, email, linkedin, twitter, is_keynote, display_order, congress_year) VALUES
    ('Mr Wiliki Takiveikata', 'President', 'Fiji Institute of Chartered Accountants', 'Mr Wiliki Takiveikata is the President of the Fiji Institute of Chartered Accountants (FICA). He leads the institute in advancing the accounting profession in Fiji and the Pacific region.', 'https://ui-avatars.com/api/?name=Wiliki+Takiveikata&background=0F2D5E&color=C8A951&size=200', 'president@fica.org.fj', NULL, NULL, 0, 1, 2025),
    ('Hon. Sitiveni Ligamamada Rabuka', 'Prime Minister & Minister for Foreign Affairs, Civil Service, Information, Public Enterprises and Veteran Affairs', 'Government of Fiji', 'Honourable Sitiveni Ligamamada Rabuka is the Prime Minister of Fiji. He delivers the keynote address at FICA Congress 2025.', 'https://ui-avatars.com/api/?name=Sitiveni+Rabuka&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 2, 2025),
    ('Mr Sharvek Naidu', 'Vice President', 'Fiji Institute of Chartered Accountants', 'Mr Sharvek Naidu serves as Vice President of FICA, supporting the institute strategic direction and representing the accounting profession at key forums.', 'https://ui-avatars.com/api/?name=Sharvek+Naidu&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 0, 3, 2025),
    ('Hon. Professor Biman Prasad', 'Deputy Prime Minister & Minister for Finance', 'Government of Fiji', 'Honourable Professor Biman Prasad is the Deputy Prime Minister and Minister for Finance. A distinguished economist, he shapes Fiji fiscal policy.', 'https://ui-avatars.com/api/?name=Biman+Prasad&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 4, 2025),
    ('Dr Clement Waine', 'Chairman/CEO & Advisor to PM of PNG', 'Private Sector / Government of PNG', 'Dr Clement Waine is a serial entrepreneur serving as Chairman and CEO of four startups, and an Advisor to the Prime Minister of Papua New Guinea.', 'https://ui-avatars.com/api/?name=Clement+Waine&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 5, 2025),
    ('Ms Ainslie van Onselen', 'CEO', 'Chartered Accountants Australia and New Zealand (CA ANZ)', 'Ms Ainslie van Onselen is the CEO of CA ANZ, one of the largest professional accounting bodies in the region.', 'https://ui-avatars.com/api/?name=Ainslie+van+Onselen&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 6, 2025),
    ('Mr Shaheen Ali', 'Permanent Secretary', 'Ministry of Trade, Cooperatives, MSMEs, and Communications', 'Mr Shaheen Ali is the Permanent Secretary leading government policy on digitalisation and ease of doing business in Fiji.', 'https://ui-avatars.com/api/?name=Shaheen+Ali&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 7, 2025),
    ('Professor Andrew Conway', 'CEO', 'Institute of Public Accountants (IPA)', 'Professor Andrew Conway is the CEO of the Institute of Public Accountants (IPA), a leading professional body for accountants.', 'https://ui-avatars.com/api/?name=Andrew+Conway&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 8, 2025),
    ('Hon. Manoa Kamikamica', 'Deputy Prime Minister & Minister for Trade', 'Government of Fiji', 'Honourable Manoa Kamikamica is the Deputy Prime Minister and Minister for Trade, championing business growth.', 'https://ui-avatars.com/api/?name=Manoa+Kamikamica&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 9, 2025),
    ('Mr Craig Cooper', 'General Counsel & EVP', 'The Wonderful Company', 'Mr Craig Cooper is the General Counsel and Executive Vice President for The Wonderful Company.', 'https://ui-avatars.com/api/?name=Craig+Cooper&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 10, 2025),
    ('Mr Brian Quigley', 'VP - Global Network Infrastructure', 'Google', 'Mr Brian Quigley is the Vice President of Global Network Infrastructure at Google.', 'https://ui-avatars.com/api/?name=Brian+Quigley&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 11, 2025),
    ('Mr Koli Sewabu', 'Acting CEO of Fiji Rugby Union & CEO of Backrow Management', 'Fiji Rugby Union / Backrow Management', 'Mr Koli Sewabu brings a unique perspective on sports management and business leadership in the Pacific.', 'https://ui-avatars.com/api/?name=Koli+Sewabu&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 12, 2025)
  `);
  console.log("✓ 12 speakers seeded (Congress 2025)");

  // Get 2025 speaker IDs
  const [speakers2025] = await pool.query("SELECT id, name FROM speakers WHERE congress_year = 2025 ORDER BY display_order");
  const s25 = {};
  speakers2025.forEach(s => { s25[s.name] = s.id; });

  // ─── Sessions — Congress 2025 Day 1: Friday 6 June 2025 ──────────────────
  // Groups: opening, session1 (Balancing Regional & Global Interests),
  //         session2 (Digitalisation & Ease of Doing Business), agm, social
  await pool.query(`
    INSERT INTO sessions (title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order, congress_year, session_group) VALUES
    ('Registration of Delegates', 'Registration of delegates and collection of congress materials. Morning tea and coffee served.', '07:30', '09:20', '2025-06-06', 'Baravi Ballroom Foyer', 'registration', NULL, NULL, 500, 1, 2025, 'opening'),
    ('Delegates Seated', 'All delegates are requested to be seated in the Main Hall.', '09:20', '09:30', '2025-06-06', 'Baravi Ballroom', 'break', NULL, NULL, 500, 2, 2025, 'opening'),
    ('Arrival of Chief Guest & National Anthem', 'Arrival of the Chief Guest and singing of the National Anthem.', '09:30', '09:40', '2025-06-06', 'Baravi Ballroom', 'ceremony', NULL, NULL, 500, 3, 2025, 'opening'),
    ('FICA President''s Welcome', 'Fiji Institute of Chartered Accountants President''s Welcome address.', '09:40', '09:50', '2025-06-06', 'Baravi Ballroom', 'ceremony', ${s25['Mr Wiliki Takiveikata']}, NULL, 500, 4, 2025, 'opening'),
    ('Keynote Address by Chief Guest', 'Keynote address by the Honourable Prime Minister.', '09:50', '10:20', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Hon. Sitiveni Ligamamada Rabuka']}, NULL, 500, 5, 2025, 'opening'),
    ('Token of Appreciation & Vote of Thanks', 'Token of Appreciation and Vote of Thanks by Vice President Mr Sharvek Naidu.', '10:20', '10:30', '2025-06-06', 'Baravi Ballroom', 'ceremony', ${s25['Mr Sharvek Naidu']}, NULL, 500, 6, 2025, 'opening'),
    ('Morning Session Break', 'Refreshments and networking.', '10:30', '10:55', '2025-06-06', 'Baravi Ballroom Foyer', 'break', NULL, NULL, 500, 7, 2025, 'opening'),
    ('Balancing Regional and Global Interests', 'Hon. Professor Biman Prasad addresses the balance between regional and global interests.', '10:55', '11:25', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Hon. Professor Biman Prasad']}, NULL, 500, 8, 2025, 'session1'),
    ('Innovation & Entrepreneurship in the Pacific', 'Dr Clement Waine shares insights on innovation and entrepreneurship in the Pacific region.', '11:25', '11:55', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Dr Clement Waine']}, NULL, 500, 9, 2025, 'session1'),
    ('The Future of Chartered Accountancy', 'Ms Ainslie van Onselen on the future direction of the chartered accounting profession.', '11:55', '12:25', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Ms Ainslie van Onselen']}, NULL, 500, 10, 2025, 'session1'),
    ('Panel Discussion – Session 1', 'Panel discussion on balancing regional and global interests.', '12:25', '13:05', '2025-06-06', 'Baravi Ballroom', 'panel', NULL, NULL, 500, 11, 2025, 'session1'),
    ('Major Sponsors'' Presentations', 'Presentations from major sponsors Vodafone and Asco Motors.', '13:05', '13:15', '2025-06-06', 'Baravi Ballroom', 'ceremony', NULL, NULL, 500, 12, 2025, 'session1'),
    ('Lunch', 'Lunch break and networking.', '13:15', '14:05', '2025-06-06', 'Crowne Plaza Restaurant', 'lunch', NULL, NULL, 500, 13, 2025, NULL),
    ('Delegates Seated', 'All delegates are requested to be seated for the afternoon session.', '14:05', '14:15', '2025-06-06', 'Baravi Ballroom', 'break', NULL, NULL, 500, 14, 2025, 'session2'),
    ('Digitalisation and Ease of Doing Business', 'Mr Shaheen Ali on digitalisation and improving the ease of doing business in Fiji.', '14:15', '14:45', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Mr Shaheen Ali']}, NULL, 500, 15, 2025, 'session2'),
    ('Public Accounting and Professional Standards', 'Professor Andrew Conway on the evolving landscape of public accounting and professional standards.', '14:45', '15:15', '2025-06-06', 'Baravi Ballroom', 'keynote', ${s25['Professor Andrew Conway']}, NULL, 500, 16, 2025, 'session2'),
    ('Panel Discussion – Session 2', 'Panel discussion on digitalisation and ease of doing business.', '15:15', '15:55', '2025-06-06', 'Baravi Ballroom', 'panel', NULL, NULL, 500, 17, 2025, 'session2'),
    ('Afternoon Session Break', 'Refreshments and networking.', '15:55', '16:10', '2025-06-06', 'Baravi Ballroom Foyer', 'break', NULL, NULL, 500, 18, 2025, 'session2'),
    ('FICA Annual General Meeting', 'Fiji Institute of Chartered Accountants Annual General Meeting.', '16:10', '17:10', '2025-06-06', 'Baravi Ballroom', 'ceremony', NULL, NULL, 500, 19, 2025, 'agm'),
    ('Cocktail', 'Friday evening cocktail reception.', '19:00', '20:00', '2025-06-06', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 20, 2025, 'social'),
    ('Theme Dinner – Tropical Paradise', 'Friday theme dinner with entertainment. Dress code: Tropical Paradise.', '20:00', '23:00', '2025-06-06', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 21, 2025, 'social'),
    ('Delegates Seated – Day 2', 'All delegates are requested to be seated in the Main Hall.', '08:30', '08:45', '2025-06-07', 'Baravi Ballroom', 'break', NULL, NULL, 500, 1, 2025, 'session3'),
    ('Businesses as Catalysts of Economic Growth', 'Hon. Manoa Kamikamica on businesses as catalysts of economic growth.', '08:45', '09:15', '2025-06-07', 'Baravi Ballroom', 'keynote', ${s25['Hon. Manoa Kamikamica']}, NULL, 500, 2, 2025, 'session3'),
    ('Corporate Governance & Legal Perspectives', 'Mr Craig Cooper on corporate governance and legal perspectives.', '09:15', '09:45', '2025-06-07', 'Baravi Ballroom', 'keynote', ${s25['Mr Craig Cooper']}, NULL, 500, 3, 2025, 'session3'),
    ('Morning Session Break', 'Refreshments and networking.', '09:45', '10:00', '2025-06-07', 'Baravi Ballroom Foyer', 'break', NULL, NULL, 500, 4, 2025, 'session3'),
    ('Global Network Infrastructure & Digital Transformation', 'Mr Brian Quigley on global connectivity and digital transformation in the Pacific.', '10:00', '10:30', '2025-06-07', 'Baravi Ballroom', 'keynote', ${s25['Mr Brian Quigley']}, NULL, 500, 5, 2025, 'session3'),
    ('Panel Discussion – Session 3', 'Panel discussion on businesses as catalysts of economic growth.', '10:30', '11:20', '2025-06-07', 'Baravi Ballroom', 'panel', NULL, NULL, 500, 6, 2025, 'session3'),
    ('Sports Management & Business Leadership', 'Mr Koli Sewabu on sports management and business leadership in the Pacific.', '11:20', '12:05', '2025-06-07', 'Baravi Ballroom', 'keynote', ${s25['Mr Koli Sewabu']}, NULL, 500, 7, 2025, 'session3'),
    ('Break', 'Short break.', '12:05', '12:15', '2025-06-07', 'Baravi Ballroom Foyer', 'break', NULL, NULL, 500, 8, 2025, 'session3'),
    ('Congress Debate', 'A lively debate on key issues facing the accounting profession and business community.', '12:15', '13:20', '2025-06-07', 'Baravi Ballroom', 'panel', NULL, NULL, 500, 9, 2025, 'session3'),
    ('Closing Remarks', 'Official closing remarks for FICA Congress 2025.', '13:20', '13:30', '2025-06-07', 'Baravi Ballroom', 'ceremony', NULL, NULL, 500, 10, 2025, NULL),
    ('Lunch', 'Lunch break.', '13:30', '15:00', '2025-06-07', 'Crowne Plaza Restaurant', 'lunch', NULL, NULL, 500, 11, 2025, NULL),
    ('Leisure', 'Free time for delegates to enjoy the resort facilities.', '15:00', '18:30', '2025-06-07', 'Crowne Plaza Fiji', 'break', NULL, NULL, 500, 12, 2025, NULL),
    ('Networking Cocktail', 'Saturday evening networking cocktail.', '18:45', '19:45', '2025-06-07', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 13, 2025, 'social'),
    ('Theme Dinner – Pacific Formal', 'Grand finale dinner with live band entertainment. Dress code: Pacific Formal.', '19:45', '22:00', '2025-06-07', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 14, 2025, 'social')
  `);
  console.log("✓ 35 sessions seeded (Congress 2025: 6–7 June 2025)");

  // ─── Sponsors (Congress 2025) ────────────────────────────────────────────
  await pool.query(`
    INSERT INTO sponsors (name, logo_url, website, tier, description, contact_name, contact_email, display_order, congress_year) VALUES
    ('Vodafone Fiji', 'https://placehold.co/200x80/E60000/ffffff?text=Vodafone+Fiji', 'https://vodafone.com.fj', 'platinum', 'Vodafone Fiji is a major sponsor providing digital connectivity and innovation across Fiji.', 'Vodafone Team', 'info@vodafone.com.fj', 1, 2025),
    ('Asco Motors', 'https://placehold.co/200x80/1a365d/ffffff?text=Asco+Motors', 'https://ascomotors.com.fj', 'platinum', 'Asco Motors is a leading automotive distributor in Fiji.', 'Asco Team', 'info@ascomotors.com.fj', 2, 2025),
    ('KPMG Fiji', 'https://placehold.co/200x80/00338D/ffffff?text=KPMG+Fiji', 'https://kpmg.com/fj', 'gold', 'KPMG provides audit, tax, and advisory services across Fiji and the Pacific.', 'KPMG Team', 'info@kpmg.com.fj', 1, 2025),
    ('Deloitte Fiji', 'https://placehold.co/200x80/86BC25/ffffff?text=Deloitte+Fiji', 'https://deloitte.com/fj', 'gold', 'Deloitte Fiji is a leading professional services firm.', 'Deloitte Team', 'info@deloitte.com.fj', 2, 2025),
    ('PricewaterhouseCoopers Fiji', 'https://placehold.co/200x80/D93954/ffffff?text=PwC+Fiji', 'https://pwc.com/fj', 'gold', 'PwC Fiji delivers assurance, advisory, and tax services.', 'PwC Team', 'info@pwc.com.fj', 3, 2025),
    ('BSP Financial Group', 'https://placehold.co/200x80/004B8D/ffffff?text=BSP', 'https://bsp.com.fj', 'silver', 'BSP Financial Group is one of the largest banking groups in the Pacific.', 'BSP Team', 'info@bsp.com.fj', 1, 2025),
    ('Fiji Airways', 'https://placehold.co/200x80/C8102E/ffffff?text=Fiji+Airways', 'https://fijiairways.com', 'silver', 'Fiji Airways is the Official Airline Partner of FICA Congress.', 'Fiji Airways Team', 'info@fijiairways.com', 2, 2025),
    ('ANZ Bank Fiji', 'https://placehold.co/200x80/0F2D5E/C8A951?text=ANZ+Fiji', 'https://anz.com/fiji', 'silver', 'ANZ Bank has been serving Pacific communities for over 130 years.', 'ANZ Team', 'info@anz.com', 3, 2025)
  `);
  console.log("✓ 8 sponsors seeded (Congress 2025)");

  // ─── Networking Slots (Congress 2025) ────────────────────────────────────
  await pool.query(`
    INSERT INTO networking_slots (title, description, start_time, end_time, slot_date, location, capacity, type, dress_code, congress_year) VALUES
    ('Cocktail Reception', 'Friday evening cocktail reception with canapes, cocktails, and networking.', '19:00', '20:00', '2025-06-06', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'cocktail', 'Smart Casual', 2025),
    ('Theme Dinner – Tropical Paradise', 'Friday night theme dinner with entertainment.', '20:00', '23:00', '2025-06-06', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'dinner', 'Tropical Paradise Theme', 2025),
    ('Networking Cocktail', 'Saturday evening networking cocktail before the gala dinner.', '18:45', '19:45', '2025-06-07', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'cocktail', 'Smart Casual', 2025),
    ('Theme Dinner – Pacific Formal', 'Grand finale gala dinner with live band entertainment.', '19:45', '22:00', '2025-06-07', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'gala', 'Pacific Formal', 2025)
  `);
  console.log("✓ 4 networking events seeded (Congress 2025)");

  // ═══════════════════════════════════════════════════════════════════════════
  // CONGRESS 2026 — Official Programme
  // "Charting New Horizons for a Changing World"
  // Venue: Convention Center at Crowne Plaza Fiji Nadi Bay Resort & Spa
  // Dates: Friday 8 May – Saturday 9 May 2026
  // ═══════════════════════════════════════════════════════════════════════════

  await pool.query(`
    INSERT INTO speakers (name, title, organization, bio, photo_url, email, linkedin, twitter, is_keynote, display_order, congress_year) VALUES
    ('Mr Sharvek Naidu', 'President', 'Fiji Institute of Chartered Accountants', 'Mr Sharvek Naidu is the President of the Fiji Institute of Chartered Accountants (FICA). He welcomes delegates to the FICA Congress 2025 held in May 2026.', 'https://ui-avatars.com/api/?name=Sharvek+Naidu&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 0, 1, 2026),
    ('Ms Patricia McKenzie', 'Financial Management Practice Manager, East Asia and Pacific (EAP) Region', 'World Bank', 'Ms Patricia McKenzie is the Financial Management Practice Manager for the East Asia and Pacific Region at the World Bank. She delivers the keynote address at FICA Congress 2025.', 'https://ui-avatars.com/api/?name=Patricia+McKenzie&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 2, 2026),
    ('H.E. Peter Roberts OAM', 'High Commissioner', 'Australian High Commission Suva', 'His Excellency Peter Roberts OAM is the Australian High Commissioner to Fiji. He is the Guest of Honour at FICA Congress 2025.', 'https://ui-avatars.com/api/?name=Peter+Roberts&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 3, 2026),
    ('Mr Kishti Sen', 'Senior Economist', 'ANZ', 'Mr Kishti Sen is a Senior Economist at ANZ, providing insights on Fiji''s economic positioning in the global landscape.', 'https://ui-avatars.com/api/?name=Kishti+Sen&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 4, 2026),
    ('Mr Naca Cawanibuka', 'General Manager, High Performance Unit', 'Fiji Rugby Union', 'Mr Naca Cawanibuka is the General Manager of the High Performance Unit at Fiji Rugby Union. He delivers a motivational address on resilience, discipline, and leadership.', 'https://ui-avatars.com/api/?name=Naca+Cawanibuka&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 5, 2026),
    ('Mr Paul Armstrong', 'Area Vice President Australia, NZ and Pacific Islands', 'Teradata', 'Mr Paul Armstrong is the Area Vice President for Australia, NZ and Pacific Islands at Teradata, specialising in AI, cybersecurity and data strategy.', 'https://ui-avatars.com/api/?name=Paul+Armstrong&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 6, 2026),
    ('Mr John Munnelly', 'Chief Digital Officer, NMP', 'KPMG', 'Mr John Munnelly is the Chief Digital Officer at KPMG NMP, leading AI governance and risk oversight initiatives.', 'https://ui-avatars.com/api/?name=John+Munnelly&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 7, 2026),
    ('Mr Vijay Narayan', 'News Director', 'Fijivillage', 'Mr Vijay Narayan is the News Director of Fijivillage. He moderates the Special Strategic Session at Congress 2025.', 'https://ui-avatars.com/api/?name=Vijay+Narayan&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 0, 8, 2026),
    ('Dr Keith Kendall', 'Chair and CEO', 'Australian Accounting Standards Board (AASB)', 'Dr Keith Kendall is the Chair and CEO of the Australian Accounting Standards Board (AASB), leading governance and sustainability standards.', 'https://ui-avatars.com/api/?name=Keith+Kendall&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 9, 2026),
    ('Dr Esther Williams', 'Former Deputy Vice-Chancellor', 'University of the South Pacific (USP)', 'Dr Esther Williams is the former Deputy Vice-Chancellor of USP, specialising in governance capability and board readiness.', 'https://ui-avatars.com/api/?name=Esther+Williams&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 10, 2026),
    ('Ms Heidi Dening', 'Director', 'Lifestyle Sanctuary Pty Ltd', 'Ms Heidi Dening is the Director of Lifestyle Sanctuary Pty Ltd. She delivers a motivational address on Leadership Under Uncertainty.', 'https://ui-avatars.com/api/?name=Heidi+Dening&background=0F2D5E&color=C8A951&size=200', NULL, NULL, NULL, 1, 11, 2026)
  `);
  console.log("✓ 11 speakers seeded (Congress 2026)");

  // Get 2026 speaker IDs
  const [speakers2026] = await pool.query("SELECT id, name FROM speakers WHERE congress_year = 2026 ORDER BY display_order");
  const s26 = {};
  speakers2026.forEach(s => { s26[s.name] = s.id; });

  // ─── Sessions — Congress 2026 Day 1: Friday 8 May 2026 ──────────────────
  // Groups: opening, session1 (NAVIGATING: Global Economics & Fiji's Positioning),
  //         session2 (TRANSFORMING: AI, Digitalisation & Professional Evolution), agm, social
  await pool.query(`
    INSERT INTO sessions (title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order, congress_year, session_group) VALUES
    ('Registration of Delegates', 'Registration of delegates. Morning Tea/Coffee served.', '07:30', '09:20', '2026-05-08', 'Convention Center Foyer', 'registration', NULL, NULL, 500, 1, 2026, 'opening'),
    ('Delegates Seated', 'All delegates are requested to be seated in the Main Hall.', '09:20', '09:30', '2026-05-08', 'Main Hall', 'break', NULL, NULL, 500, 2, 2026, 'opening'),
    ('Arrival of Keynote Speaker & National Anthem', 'Arrival of the Keynote Speaker and Guest of Honour & Singing of the National Anthem.', '09:30', '09:40', '2026-05-08', 'Main Hall', 'ceremony', NULL, NULL, 500, 3, 2026, 'opening'),
    ('FICA President''s Welcome', 'Fiji Institute of Chartered Accountants President''s Welcome by Mr Sharvek Naidu.', '09:40', '09:45', '2026-05-08', 'Main Hall', 'ceremony', ${s26['Mr Sharvek Naidu']}, NULL, 500, 4, 2026, 'opening'),
    ('Keynote Address', 'Keynote Address by Ms Patricia McKenzie, Financial Management Practice Manager, East Asia and Pacific (EAP) Region, World Bank.', '09:45', '10:15', '2026-05-08', 'Main Hall', 'keynote', ${s26['Ms Patricia McKenzie']}, NULL, 500, 5, 2026, 'opening'),
    ('Address by Guest of Honour', 'Address by Guest of Honour — H.E. Peter Roberts OAM, High Commissioner, Australian High Commission Suva.', '10:15', '10:45', '2026-05-08', 'Main Hall', 'keynote', ${s26['H.E. Peter Roberts OAM']}, NULL, 500, 6, 2026, 'opening'),
    ('Token of Appreciation and Vote of Thanks', 'Token of Appreciation and Vote of Thanks.', '10:45', '10:50', '2026-05-08', 'Main Hall', 'ceremony', NULL, NULL, 500, 7, 2026, 'opening'),
    ('Morning Session Break', 'Morning session break.', '10:50', '11:15', '2026-05-08', 'Convention Center Foyer', 'break', NULL, NULL, 500, 8, 2026, 'opening'),
    ('Charting Fiji''s Place in a Shifting World', 'Mr Kishti Sen, Senior Economist at ANZ — Charting Fiji''s Place in a Shifting World: From the Pacific to the Globe.', '11:15', '11:30', '2026-05-08', 'Main Hall', 'keynote', ${s26['Mr Kishti Sen']}, NULL, 500, 9, 2026, 'session1'),
    ('Panel: Positioning Fiji in a Fragmented World', 'Panel Discussion: "Positioning Fiji in a Fragmented World: Risk, Reform and Readiness".', '11:30', '12:10', '2026-05-08', 'Main Hall', 'panel', NULL, NULL, 500, 10, 2026, 'session1'),
    ('Major Sponsors'' Presentations', 'Major Sponsors'' presentations — Vodafone and Asco Motors.', '12:10', '12:20', '2026-05-08', 'Main Hall', 'ceremony', NULL, NULL, 500, 11, 2026, 'session1'),
    ('From Field to Future: Resilience, Discipline & Leadership', 'Motivational Speaker: Mr Naca Cawanibuka, General Manager, High Performance Unit, Fiji Rugby Union — From Field to Future: Resilience, Discipline & Leadership.', '12:20', '12:50', '2026-05-08', 'Main Hall', 'keynote', ${s26['Mr Naca Cawanibuka']}, NULL, 500, 12, 2026, 'session1'),
    ('Lunch', 'Lunch break.', '13:00', '14:00', '2026-05-08', 'Convention Center Dining', 'lunch', NULL, NULL, 500, 13, 2026, NULL),
    ('Delegates Seated – Afternoon', 'All delegates are requested to be seated in the Main Hall.', '14:00', '14:15', '2026-05-08', 'Main Hall', 'break', NULL, NULL, 500, 14, 2026, 'session2'),
    ('Beyond Compliance: AI, Cybersecurity and Data', 'Mr Paul Armstrong, Area Vice President Australia, NZ and Pacific Islands, Teradata — Beyond Compliance: Using AI, cybersecurity and Data to Navigate New Horizons.', '14:15', '14:45', '2026-05-08', 'Main Hall', 'keynote', ${s26['Mr Paul Armstrong']}, NULL, 500, 15, 2026, 'session2'),
    ('AI Governance & Risk Oversight', 'Mr John Munnelly, Chief Digital Officer, NMP, KPMG — AI Governance & Risk Oversight.', '14:45', '15:15', '2026-05-08', 'Main Hall', 'keynote', ${s26['Mr John Munnelly']}, NULL, 500, 16, 2026, 'session2'),
    ('Panel: Transforming Fiji – Digital Readiness & Reform', 'Panel Discussion: "Transforming Fiji: Digital Readiness, Tax Systems & Regulatory Reform".', '15:15', '15:55', '2026-05-08', 'Main Hall', 'panel', NULL, NULL, 500, 17, 2026, 'session2'),
    ('Afternoon Session Break', 'Afternoon session break.', '15:55', '16:10', '2026-05-08', 'Convention Center Foyer', 'break', NULL, NULL, 500, 18, 2026, 'session2'),
    ('FICA Annual General Meeting', 'Fiji Institute of Chartered Accountants Annual General Meeting.', '16:10', '17:10', '2026-05-08', 'Main Hall', 'ceremony', NULL, NULL, 500, 19, 2026, 'agm'),
    ('Cocktail', 'Friday evening cocktail.', '19:00', '20:00', '2026-05-08', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 20, 2026, 'social'),
    ('Theme Dinner – Fijian Fusion', 'Friday theme dinner — Fijian Fusion with entertainment.', '20:00', '23:00', '2026-05-08', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 21, 2026, 'social')
  `);

  // ─── Sessions — Congress 2026 Day 2: Saturday 9 May 2026 ────────────────
  // SESSION 3: SUSTAINING — Governance, Sustainability & Long-Term Value
  await pool.query(`
    INSERT INTO sessions (title, description, start_time, end_time, session_date, room, type, speaker_id, moderator, capacity, display_order, congress_year, session_group) VALUES
    ('Delegates Seated – Day 2', 'All delegates are requested to be seated in the Main Hall.', '08:45', '09:00', '2026-05-09', 'Main Hall', 'break', NULL, NULL, 500, 1, 2026, 'session3'),
    ('Special Strategic Session', 'SPECIAL STRATEGIC SESSION moderated by Mr. Vijay Narayan, Fijivillage News Director.', '09:00', '09:40', '2026-05-09', 'Main Hall', 'panel', NULL, 'Mr. Vijay Narayan', 500, 2, 2026, 'session3'),
    ('Governance & Sustainability Standards', 'Dr Keith Kendall, Chair and CEO of the Australian Accounting Standards Board (AASB) — Governance & Sustainability Standards.', '09:40', '10:10', '2026-05-09', 'Main Hall', 'keynote', ${s26['Dr Keith Kendall']}, NULL, 500, 3, 2026, 'session3'),
    ('Morning Session Break', 'Morning session break.', '10:10', '10:25', '2026-05-09', 'Convention Center Foyer', 'break', NULL, NULL, 500, 4, 2026, 'session3'),
    ('Governance Capability & Board Readiness', 'Dr Esther Williams, former Deputy Vice-Chancellor of USP — Governance Capability & Board Readiness.', '10:25', '10:55', '2026-05-09', 'Main Hall', 'keynote', ${s26['Dr Esther Williams']}, NULL, 500, 5, 2026, 'session3'),
    ('Panel: Global Standards, Local Reality', 'Panel Discussion: "Global Standards, Local Reality: Strengthening Governance in Fiji".', '10:55', '11:35', '2026-05-09', 'Main Hall', 'panel', NULL, NULL, 500, 6, 2026, 'session3'),
    ('Leadership Under Uncertainty', 'Motivational Speaker: Ms Heidi Dening, Director Lifestyle Sanctuary Pty Ltd — Leadership Under Uncertainty.', '11:35', '12:20', '2026-05-09', 'Main Hall', 'keynote', ${s26['Ms Heidi Dening']}, NULL, 500, 7, 2026, 'session3'),
    ('Break', 'Short break.', '12:20', '12:30', '2026-05-09', 'Convention Center Foyer', 'break', NULL, NULL, 500, 8, 2026, 'session3'),
    ('Congress Debate', 'Debate on key issues facing the profession.', '12:30', '13:30', '2026-05-09', 'Main Hall', 'panel', NULL, NULL, 500, 9, 2026, 'session3'),
    ('Closing Remarks', 'Closing Remarks for FICA Congress.', '13:30', '13:40', '2026-05-09', 'Main Hall', 'ceremony', NULL, NULL, 500, 10, 2026, NULL),
    ('Lunch', 'Lunch.', '13:40', '15:00', '2026-05-09', 'Convention Center Dining', 'lunch', NULL, NULL, 500, 11, 2026, NULL),
    ('Leisure', 'Leisure time for delegates.', '15:00', '18:30', '2026-05-09', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'break', NULL, NULL, 500, 12, 2026, NULL),
    ('Networking Cocktail', 'Saturday evening networking cocktail.', '18:45', '19:45', '2026-05-09', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 13, 2026, 'social'),
    ('Theme Dinner – TBC', 'Saturday theme dinner with entertainment. Theme to be confirmed.', '19:45', '22:00', '2026-05-09', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 'networking', NULL, NULL, 500, 14, 2026, 'social')
  `);
  console.log("✓ 35 sessions seeded (Congress 2026: 8–9 May 2026)");

  // ─── Sponsors (Congress 2026) ────────────────────────────────────────────
  await pool.query(`
    INSERT INTO sponsors (name, logo_url, website, tier, description, contact_name, contact_email, display_order, congress_year) VALUES
    ('Vodafone Fiji', 'https://placehold.co/200x80/E60000/ffffff?text=Vodafone+Fiji', 'https://vodafone.com.fj', 'platinum', 'Vodafone Fiji is a major sponsor of FICA Congress, providing digital connectivity and innovation across Fiji.', 'Vodafone Team', 'info@vodafone.com.fj', 1, 2026),
    ('Asco Motors', 'https://placehold.co/200x80/1a365d/ffffff?text=Asco+Motors', 'https://ascomotors.com.fj', 'platinum', 'Asco Motors is a major sponsor and a leading automotive distributor in Fiji.', 'Asco Team', 'info@ascomotors.com.fj', 2, 2026),
    ('KPMG Fiji', 'https://placehold.co/200x80/00338D/ffffff?text=KPMG+Fiji', 'https://kpmg.com/fj', 'gold', 'KPMG provides audit, tax, and advisory services across Fiji and the Pacific.', 'KPMG Team', 'info@kpmg.com.fj', 1, 2026),
    ('Deloitte Fiji', 'https://placehold.co/200x80/86BC25/ffffff?text=Deloitte+Fiji', 'https://deloitte.com/fj', 'gold', 'Deloitte Fiji is a leading professional services firm.', 'Deloitte Team', 'info@deloitte.com.fj', 2, 2026),
    ('PricewaterhouseCoopers Fiji', 'https://placehold.co/200x80/D93954/ffffff?text=PwC+Fiji', 'https://pwc.com/fj', 'gold', 'PwC Fiji delivers assurance, advisory, and tax services.', 'PwC Team', 'info@pwc.com.fj', 3, 2026),
    ('BSP Financial Group', 'https://placehold.co/200x80/004B8D/ffffff?text=BSP', 'https://bsp.com.fj', 'silver', 'BSP Financial Group is one of the largest banking groups in the Pacific.', 'BSP Team', 'info@bsp.com.fj', 1, 2026),
    ('Fiji Airways', 'https://placehold.co/200x80/C8102E/ffffff?text=Fiji+Airways', 'https://fijiairways.com', 'silver', 'Fiji Airways is the Official Airline Partner of FICA Congress.', 'Fiji Airways Team', 'info@fijiairways.com', 2, 2026),
    ('ANZ Bank Fiji', 'https://placehold.co/200x80/0F2D5E/C8A951?text=ANZ+Fiji', 'https://anz.com/fiji', 'silver', 'ANZ Bank has been serving Pacific communities for over 130 years.', 'ANZ Team', 'info@anz.com', 3, 2026)
  `);
  console.log("✓ 8 sponsors seeded (Congress 2026)");

  // ─── Networking Slots (Congress 2026) ────────────────────────────────────
  await pool.query(`
    INSERT INTO networking_slots (title, description, start_time, end_time, slot_date, location, capacity, type, dress_code, congress_year) VALUES
    ('Cocktail', 'Friday evening cocktail reception.', '19:00', '20:00', '2026-05-08', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'cocktail', 'Smart Casual', 2026),
    ('Theme Dinner – Fijian Fusion', 'Friday theme dinner — Fijian Fusion with entertainment.', '20:00', '23:00', '2026-05-08', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'dinner', 'Fijian Fusion Theme', 2026),
    ('Networking Cocktail', 'Saturday evening networking cocktail.', '18:45', '19:45', '2026-05-09', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'cocktail', 'Smart Casual', 2026),
    ('Theme Dinner – TBC', 'Saturday theme dinner with entertainment. Theme to be confirmed.', '19:45', '22:00', '2026-05-09', 'Crowne Plaza Fiji Nadi Bay Resort & Spa', 500, 'dinner', 'TBC', 2026)
  `);
  console.log("✓ 4 networking events seeded (Congress 2026)");

  // ─── Attendees ───────────────────────────────────────────────────────────
  await pool.query("DELETE FROM votes");
  await pool.query("DELETE FROM meetings");
  await pool.query("DELETE FROM connections");
  await pool.query("DELETE FROM messages");
  await pool.query("DELETE FROM attendees");
  const attendees = [
    ["Mere Ratumaiyale", "m.ratumaiyale@fijifirst.com.fj", "Fiji First Accounting", "Senior Accountant", "+679 9234567", "full", false, false, "Vegetarian"],
    ["Rajiv Sharma", "r.sharma@kpmg.com.fj", "KPMG Fiji", "Audit Manager", "+679 9876543", "full", false, false, null],
    ["Ana Vunilagi", "a.vunilagi@rbf.gov.fj", "Reserve Bank of Fiji", "Financial Analyst", "+679 9112233", "full", false, false, "Gluten Free"],
    ["David Chen", "d.chen@deloitte.com.fj", "Deloitte Fiji", "Tax Partner", "+679 9988776", "vip", false, false, null],
    ["Sereana Naivalu", "s.naivalu@frcs.org.fj", "FRCS", "Revenue Officer", "+679 9345678", "day1", false, false, null],
    ["Mohammed Ali", "m.ali@bsp.com.fj", "BSP Financial Group", "Finance Director", "+679 9456789", "full", false, false, "Halal"],
    ["Emma Thompson", "e.thompson@worldbank.org", "World Bank", "Consultant", "+1 202 555 0123", "vip", false, false, null],
    ["Pita Waqabaca", "p.waqabaca@fijiairways.com", "Fiji Airways", "CFO", "+679 9567890", "full", false, false, null],
    ["Leilani Tora", "l.tora@anz.com.fj", "ANZ Bank Fiji", "Branch Manager", "+679 9678901", "full", false, false, "Vegan"],
    ["James Koroivuki", "j.koroivuki@bsplife.com.fj", "BSP Life Fiji", "Actuary", "+679 9789012", "full", false, false, null],
    ["Kritish Singh", "kritish@fica.com", "FICA", "Developer", "+679 9999999", "vip", false, false, null],
  ];
  const delegatePasswordHash = await bcrypt.hash("delegate123", 10);
  const kritishPasswordHash = await bcrypt.hash("pass123", 10);
  for (const [name, email, org, title, phone, ticket, d1, d2, diet] of attendees) {
    const code = "FICA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const pw = email === "kritish@fica.com" ? kritishPasswordHash : delegatePasswordHash;
    await pool.query(
      "INSERT INTO attendees (name, email, organization, job_title, phone, registration_code, ticket_type, check_in_day1, check_in_day2, dietary_requirements, password_hash, account_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,TRUE) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), account_active=TRUE",
      [name, email, org, title, phone, code, ticket, d1, d2, diet, pw]
    );
  }
  console.log("✓ 11 attendees seeded (kritish@fica.com / pass123, others / delegate123)");

  // ─── Announcements ───────────────────────────────────────────────────────
  await pool.query("DELETE FROM announcements");
  await pool.query(`
    INSERT INTO announcements (title, body, type, target, published, published_at) VALUES
    ('Welcome to FICA Congress 2026!', 'We are delighted to welcome you to the Fiji Institute of Chartered Accountants Congress at the Convention Center, Crowne Plaza Fiji Nadi Bay Resort & Spa. Theme: Charting New Horizons for a Changing World. Please collect your delegate bag from the registration desk.', 'info', 'all', TRUE, NOW()),
    ('Wi-Fi Access Details', 'Congress Wi-Fi — Network: FICA2026 | Password: FICACongress2026! Coverage available throughout the resort.', 'info', 'all', TRUE, NOW()),
    ('Theme Dinner Tonight – Fijian Fusion', 'Reminder: Friday''s Theme Dinner begins at 8:00pm. Dress code is Fijian Fusion. Cocktails from 7:00pm.', 'reminder', 'all', TRUE, NOW()),
    ('Saturday Theme Dinner', 'Saturday''s Theme Dinner — theme to be confirmed. Networking cocktails from 6:45pm, dinner at 7:45pm with entertainment.', 'reminder', 'all', FALSE, NULL),
    ('FICA AGM – Friday 4:10pm', 'Reminder: The FICA Annual General Meeting takes place Friday at 4:10pm in the Main Hall. All FICA members are encouraged to attend.', 'update', 'all', TRUE, NOW())
  `);
  console.log("✓ 5 announcements seeded");

  // ─── Event Settings ──────────────────────────────────────────────────────
  const settingsData = [
    ["event_name", "FICA Congress 2025"],
    ["event_theme", "Charting New Horizons for a Changing World"],
    ["event_date_start", "2026-05-08"],
    ["event_date_end", "2026-05-09"],
    ["event_venue", "Convention Center at Crowne Plaza Fiji Nadi Bay Resort & Spa"],
    ["event_website", "https://congress.fica.org.fj"],
    ["event_email", "congress@fica.org.fj"],
    ["event_phone", "+679 3315266"],
    ["registration_open", "true"],
    ["mobile_app_enabled", "true"],
    ["max_capacity", "500"],
    ["currency", "FJD"],
    ["timezone", "Pacific/Fiji"],
    ["voting_open", "true"],
    ["current_congress_year", "2026"],
  ];
  await pool.query("DELETE FROM event_settings");
  for (const [key, value] of settingsData) {
    await pool.query(
      "INSERT INTO event_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?",
      [key, value, value]
    );
  }
  console.log("✓ Event settings seeded");

  // ─── Projects (for Voting) ────────────────────────────────────────────
  await pool.query("DELETE FROM projects");
  await pool.query(`
    INSERT INTO projects (name, description, team, image_url, category, display_order) VALUES
    ('FijiTax AI Assistant', 'An AI-powered chatbot that helps Fijian SMEs navigate tax obligations, calculate PAYE and VAT, and prepare filing-ready returns. Built with natural language processing to answer tax queries in English and iTaukei.', 'Team TaxBot Fiji', 'https://placehold.co/600x300/6b21a8/ffffff?text=FijiTax+AI', 'technology', 1),
    ('GreenLedger Carbon Tracker', 'A cloud-based carbon accounting platform designed for Pacific Island businesses to measure, report, and reduce their carbon footprint in compliance with ISSB sustainability standards.', 'Team GreenLedger', 'https://placehold.co/600x300/276749/ffffff?text=GreenLedger', 'sustainability', 2),
    ('Pacific Audit Connect', 'A blockchain-powered audit trail platform that enables real-time, tamper-proof verification of financial statements across Pacific Island accounting firms, reducing fraud risk and improving cross-border transparency.', 'Team AuditChain', 'https://placehold.co/600x300/2c5282/ffffff?text=Audit+Connect', 'innovation', 3),
    ('FinLit Fiji – Financial Literacy App', 'A gamified mobile app teaching financial literacy to young Fijians aged 15–25. Covers budgeting, saving, investing, and understanding credit through interactive modules and local case studies.', 'Team FinLit', 'https://placehold.co/600x300/c05621/ffffff?text=FinLit+Fiji', 'community', 4),
    ('SmartReceipt POS Integration', 'An affordable cloud POS system for Fijian market vendors and small shops that digitises receipts, automates GST calculations, and syncs with FRCS for simplified tax compliance.', 'Team SmartReceipt', 'https://placehold.co/600x300/0F2D5E/C8A951?text=SmartReceipt', 'technology', 5),
    ('WaiFund – Community Microfinance Platform', 'A peer-to-peer microfinance platform connecting rural Fijian communities with micro-investors. Features transparent lending, repayment tracking, and financial health scoring for underbanked populations.', 'Team WaiFund', 'https://placehold.co/600x300/92620c/ffffff?text=WaiFund', 'community', 6)
  `);
  console.log("✓ 6 projects seeded for voting");

  await pool.end();
  console.log("\n✅ FICA Congress seed complete (2025 historical + 2026 current)!");
  console.log("   Admin: admin@fica.com / admin123");
  console.log("   Delegate: kritish@fica.com / pass123");
  console.log("   Other delegates: delegate123");
  console.log("   6 projects ready for voting (voting is open)");
}

seed().catch(err => { console.error(err); process.exit(1); });
