-- 2026-04-16 — FICA Congress sponsor roster update
--
-- Replaces the old 8-row placehold.co sponsor seed with the 10 actual 2026
-- sponsors from the official programme (applied to both 2025 and 2026 since
-- the 2025 roster wasn't provided). Real logos live at /sponsors/*.png in
-- the frontend public folder — make sure the nginx docroot has them after
-- the frontend build is deployed.
--
-- Apply on VPS:
--   mysql -u <user> -p <database> < migrations/2026-04-16_sponsors_fica2026_roster.sql
--
-- Safe to re-run: transaction wraps the delete + insert for both years.

START TRANSACTION;

DELETE FROM sponsors WHERE congress_year IN (2025, 2026);

INSERT INTO sponsors (name, logo_url, website, tier, description, contact_name, contact_email, display_order, congress_year) VALUES
  ('Vodafone Fiji',             '/sponsors/vodafone.png',         'https://vodafone.com.fj',                   'platinum',  'Vodafone Fiji is a Platinum Major Sponsor, providing digital connectivity and innovation across Fiji.',                     NULL, NULL, 1, 2026),
  ('Asco Motors',               '/sponsors/asco-motors.png',      'https://www.toyota-fiji.com',               'platinum',  'Asco Motors is a Platinum Major Sponsor and leading automotive distributor in Fiji — "Let''s Go with Asco!".',              NULL, NULL, 2, 2026),
  ('Extra Supermarket',         '/sponsors/extra.png',            'https://extra.com.fj',                      'gold',      'Extra Supermarket is the Gold Sponsor — a proudly Fijian-owned retail business.',                                           NULL, NULL, 1, 2026),
  ('Merchant Finance',          '/sponsors/merchant-finance.png', 'https://merchantfinance.com.fj',            'bronze',    'Merchant Finance is a Bronze Sponsor and Fiji''s largest non-bank licensed credit institution.',                            NULL, NULL, 1, 2026),
  ('Marsh',                     '/sponsors/marsh.png',            'https://www.marsh.com',                     'bronze',    'Marsh is a Bronze Sponsor — a global leader in risk, reinsurance, and consulting.',                                         NULL, NULL, 2, 2026),
  ('Motibhai Group',            '/sponsors/motibhai.png',         'https://www.motibhai.com',                  'supporter', 'Motibhai Group is a Support Sponsor — a diversified Fijian corporate group established in 1931.',                          NULL, NULL, 1, 2026),
  ('Chartered Accountants ANZ', '/sponsors/ca-anz.png',           'https://www.charteredaccountantsanz.com',   'supporter', 'CA ANZ is a Support Sponsor representing over 120,000 chartered accountants across Australia and New Zealand.',             NULL, NULL, 2, 2026),
  ('Datec Fiji',                '/sponsors/datec.png',            'https://datec.com.fj',                      'supporter', 'Datec is a Support Sponsor providing complete IT and E-Business solutions to Fiji and the South Pacific.',                  NULL, NULL, 3, 2026),
  ('Fiji Airways',              '/sponsors/fiji-airways.png',     'https://www.fijiairways.com',               'supporter', 'Fiji Airways is a Support Sponsor and the Official Airline Partner of FICA Congress.',                                      NULL, NULL, 4, 2026),
  ('The Fiji Times',            '/sponsors/fiji-times.png',       'https://www.fijitimes.com.fj',              'media',     'The Fiji Times is the Official Media Partner of FICA Congress.',                                                            NULL, NULL, 1, 2026),

  ('Vodafone Fiji',             '/sponsors/vodafone.png',         'https://vodafone.com.fj',                   'platinum',  'Vodafone Fiji is a Platinum Major Sponsor, providing digital connectivity and innovation across Fiji.',                     NULL, NULL, 1, 2025),
  ('Asco Motors',               '/sponsors/asco-motors.png',      'https://www.toyota-fiji.com',               'platinum',  'Asco Motors is a Platinum Major Sponsor and leading automotive distributor in Fiji — "Let''s Go with Asco!".',              NULL, NULL, 2, 2025),
  ('Extra Supermarket',         '/sponsors/extra.png',            'https://extra.com.fj',                      'gold',      'Extra Supermarket is the Gold Sponsor — a proudly Fijian-owned retail business.',                                           NULL, NULL, 1, 2025),
  ('Merchant Finance',          '/sponsors/merchant-finance.png', 'https://merchantfinance.com.fj',            'bronze',    'Merchant Finance is a Bronze Sponsor and Fiji''s largest non-bank licensed credit institution.',                            NULL, NULL, 1, 2025),
  ('Marsh',                     '/sponsors/marsh.png',            'https://www.marsh.com',                     'bronze',    'Marsh is a Bronze Sponsor — a global leader in risk, reinsurance, and consulting.',                                         NULL, NULL, 2, 2025),
  ('Motibhai Group',            '/sponsors/motibhai.png',         'https://www.motibhai.com',                  'supporter', 'Motibhai Group is a Support Sponsor — a diversified Fijian corporate group established in 1931.',                          NULL, NULL, 1, 2025),
  ('Chartered Accountants ANZ', '/sponsors/ca-anz.png',           'https://www.charteredaccountantsanz.com',   'supporter', 'CA ANZ is a Support Sponsor representing over 120,000 chartered accountants across Australia and New Zealand.',             NULL, NULL, 2, 2025),
  ('Datec Fiji',                '/sponsors/datec.png',            'https://datec.com.fj',                      'supporter', 'Datec is a Support Sponsor providing complete IT and E-Business solutions to Fiji and the South Pacific.',                  NULL, NULL, 3, 2025),
  ('Fiji Airways',              '/sponsors/fiji-airways.png',     'https://www.fijiairways.com',               'supporter', 'Fiji Airways is a Support Sponsor and the Official Airline Partner of FICA Congress.',                                      NULL, NULL, 4, 2025),
  ('The Fiji Times',            '/sponsors/fiji-times.png',       'https://www.fijitimes.com.fj',              'media',     'The Fiji Times is the Official Media Partner of FICA Congress.',                                                            NULL, NULL, 1, 2025);

COMMIT;

-- Expected result: 20 rows (10 sponsors × 2 congress years)
SELECT congress_year, COUNT(*) AS n FROM sponsors GROUP BY congress_year;
