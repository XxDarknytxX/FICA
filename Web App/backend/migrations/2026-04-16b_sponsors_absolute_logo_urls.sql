-- 2026-04-16b — Make sponsor logo_url values absolute
--
-- The first migration on this date set logo_url to `/sponsors/*.png`
-- (relative). That works fine in the browser (same-origin resolution),
-- but the iOS and Android apps have no implicit origin — Coil on Android
-- silently fails to load the image, and once iOS starts using AsyncImage
-- it would fail the same way.
--
-- Patch the existing rows to full `https://eventsfiji.cloud/sponsors/*.png`
-- URLs so every client (web + mobile) resolves them identically.
--
-- Idempotent: only rewrites rows still holding the relative prefix.
--
-- Apply on VPS:
--   mysql -u <user> -p <database> < migrations/2026-04-16b_sponsors_absolute_logo_urls.sql

UPDATE sponsors
   SET logo_url = CONCAT('https://eventsfiji.cloud', logo_url)
 WHERE logo_url LIKE '/sponsors/%';

-- Verify — all non-null logo_url values should now start with https://
SELECT congress_year, COUNT(*) AS rows_with_absolute_url
  FROM sponsors
 WHERE logo_url LIKE 'https://eventsfiji.cloud/sponsors/%'
 GROUP BY congress_year;
