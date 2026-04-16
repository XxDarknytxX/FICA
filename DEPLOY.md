# Deployment Guide

Ops-focused reference for pushing the FICA Congress platform to production.
Covers the web app (backend API + frontend SPA), database migrations, and
the two native mobile apps.

---

## 🌐 Server Topology

| Piece            | Where                                        |
|------------------|----------------------------------------------|
| Domain           | `https://eventsfiji.cloud`                   |
| Host             | `root@eventsfiji` (IP `145.79.10.93`)        |
| OS               | Ubuntu 25.10                                 |
| Repo on VPS      | `/opt/fica`                                  |
| Backend process  | PM2 (Node.js, default port `5000`)           |
| Frontend docroot | `/var/www/eventsfiji/` (served by nginx)     |
| Database         | MySQL — credentials in `Web App/backend/.env`|
| Git remote       | `origin` → https://github.com/XxDarknytxX/FICA |

SSH in:
```bash
ssh root@eventsfiji
# or
ssh root@145.79.10.93
```

All commands in this guide assume you've already SSH'd in unless noted.

---

## 🚀 Standard Web Deploy

The routine for pushing a new release to production. Run from a shell on
the VPS.

### 1. Pull the latest code
```bash
cd /opt/fica
git pull origin main
```

### 2. Rebuild the frontend
```bash
cd "/opt/fica/Web App/frontend"
npm install           # safe no-op when no new deps
npm run build
```

### 3. Copy the build to the nginx docroot
```bash
cp -r build/* /var/www/eventsfiji/
```

The `public/sponsors/*.png` folder is copied verbatim into `build/` by the
bundler, so it lands at `/var/www/eventsfiji/sponsors/` automatically.
Verify if you want:
```bash
ls -la /var/www/eventsfiji/sponsors/
```

### 4. Backend — restart only if backend code changed
```bash
cd "/opt/fica/Web App/backend"
npm install           # only if dependencies changed
pm2 list              # look up the process name
pm2 restart <name>    # e.g. fica-api
```

Static-only changes (frontend assets, DB migrations) do **not** need a PM2
restart — the Express app isn't holding the changed files.

### 5. Apply any pending DB migrations
See [Database Migrations](#-database-migrations) below.

### 6. Smoke test
```bash
curl -s  https://eventsfiji.cloud/api/event/sponsors?year=2026 | head
curl -sI https://eventsfiji.cloud/sponsors/vodafone.png | head -3
```

Expected:
- The JSON response contains the 10 real sponsors with `https://eventsfiji.cloud/sponsors/*.png` logo URLs.
- The image HEAD returns `HTTP/2 200` with `content-type: image/png`.

---

## 🗄️ Database Migrations

Targeted SQL migrations live in [`Web App/backend/migrations/`](Web%20App/backend/migrations/)
and are named with an ISO date prefix (`YYYY-MM-DD[x]_<description>.sql`).

### Apply a migration
The backend `.env` already has the right DB creds — source it rather than
typing them out:

```bash
cd "/opt/fica/Web App/backend"
set -a; source .env; set +a
mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
      -h "$DATABASE_HOST" -P "$DATABASE_PORT" \
      "$DATABASE_NAME" \
      < migrations/<file>.sql
```

Every migration in this repo is wrapped in a transaction, so partial
failures roll back cleanly. If a migration prints verification `SELECT`
output at the end, eyeball it.

### Seed script — ⚠️ **destructive**
`node src/seed.js` wipes **all** sessions, speakers, sponsors, networking
slots, attendees, and announcements before re-inserting from `seed.js`.
Prefer a targeted migration for production changes; only use the seed on
fresh environments or when you genuinely want to reset everything.

---

## 📱 iOS App (TestFlight / App Store)

Project: `IOS App/Events.xcodeproj`.

| Setting             | Value                 |
|---------------------|-----------------------|
| Bundle ID           | `com.fica.congress`   |
| Display Name        | `FICA Congress`       |
| Team                | `XPY9T92736`          |
| Minimum iOS         | — (default set in Xcode) |
| API base URL        | `https://eventsfiji.cloud/api` (hardcoded in `Services/APIService.swift`) |

### Build + upload
1. Open `IOS App/Events.xcodeproj` in Xcode.
2. Bump the build number: `MARKETING_VERSION` for user-visible version, `CURRENT_PROJECT_VERSION` for the internal build counter. Both are in `Events.xcodeproj/project.pbxproj`.
3. Select the **Any iOS Device (arm64)** destination.
4. **Product → Archive**.
5. In the Organizer that opens, pick the new archive → **Distribute App** → **App Store Connect** → **Upload**.
6. Once it finishes processing in App Store Connect (~10–30 min), add it to a TestFlight group or submit for review.

### Command-line alternative
```bash
cd "/Users/kritishsingh/Desktop/Developments/Events App/IOS App"
xcodebuild -project Events.xcodeproj -scheme Events \
           -configuration Release -sdk iphoneos \
           -archivePath build/Events.xcarchive archive
xcodebuild -exportArchive -archivePath build/Events.xcarchive \
           -exportPath build/ipa -exportOptionsPlist ExportOptions.plist
# Then upload build/ipa/Events.ipa with Transporter or altool.
```
(You'll need an `ExportOptions.plist` with your team ID and `method = app-store-connect`.)

---

## 🤖 Android App (Play Console)

Project: `Android App/` (Gradle).

| Setting             | Value                          |
|---------------------|--------------------------------|
| Application ID      | `com.fica.events`              |
| App Name            | `FICA Congress`                |
| Min SDK             | 26 (Android 8.0)               |
| Target SDK          | 35                             |
| API base URL        | Set in `data/api/ApiClient.kt` |

### Build a release bundle
```bash
cd "Android App"
./gradlew bundleRelease   # outputs app/build/outputs/bundle/release/app-release.aab
```

Signing config must be set up first — see `app/build.gradle.kts`
`signingConfigs { release { … } }`. Don't commit the keystore or
passwords; keep them out of git.

### Upload
1. Go to the [Play Console](https://play.google.com/console).
2. Your app → Production (or Internal testing / Closed testing).
3. **Create new release** → upload the `.aab`.
4. Fill release notes → review → rollout.

---

## 🔁 Typical Deploy Scenarios

### "I just pushed code changes"

| What you changed             | What to run on VPS                         |
|------------------------------|--------------------------------------------|
| Frontend only                | Steps 1–3 (`git pull`, `npm run build`, `cp`) |
| Backend only                 | Steps 1, 4 (`git pull`, PM2 restart)       |
| Both                         | All of Steps 1–4                           |
| DB change (new migration)    | Steps 1 + 5 (`git pull`, `mysql < …`)      |
| Sponsor logo / seed data     | Steps 1–3 + 5 (assets + migration)         |
| Mobile app only              | Nothing on VPS; rebuild/re-upload mobile app |

### Mobile app doesn't see updated images
- Images are cached aggressively. After deploying new image bytes at the
  same URL, the app will eventually pick them up as HTTP cache entries
  expire. To force a refresh: reinstall the app, or (in-app) pull to
  refresh on the sponsors/home screens.
- If you changed an *image URL* (not just bytes), run the relevant DB
  migration so clients see the new URL.

### Rollback
Git is the source of truth:
```bash
cd /opt/fica
git log --oneline -5                    # find the previous good commit
git checkout <sha>                      # detached HEAD on that commit
# rebuild frontend + restart backend as in Standard Deploy
# to return to main: git checkout main
```
For DB schema changes, you need to write a reverse migration — migrations
in this repo are not automatically reversible.

---

## 🧰 Common Reference

### PM2
```bash
pm2 list                     # running processes
pm2 logs <name> --lines 200  # tail logs
pm2 restart <name>           # restart after code change
pm2 save                     # persist list so it survives reboot
```

### nginx
```bash
nginx -t                     # test config
systemctl reload nginx       # apply config changes
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### MySQL
```bash
cd "/opt/fica/Web App/backend" && set -a; source .env; set +a
mysql -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" \
      -h "$DATABASE_HOST" -P "$DATABASE_PORT" "$DATABASE_NAME"
```

Quick sanity counts:
```sql
SELECT COUNT(*) AS sponsors   FROM sponsors;
SELECT COUNT(*) AS speakers   FROM speakers;
SELECT COUNT(*) AS sessions   FROM sessions;
SELECT COUNT(*) AS attendees  FROM attendees;
```

### Log locations
| What              | Where                                 |
|-------------------|---------------------------------------|
| PM2 app logs      | `pm2 logs` / `~/.pm2/logs/`           |
| nginx access/error| `/var/log/nginx/`                     |
| MySQL error       | `/var/log/mysql/error.log`            |
| Systemd journal   | `journalctl -u <unit>`                |

---

## 🔐 Secrets

Never commit these. They live on the VPS only:

| File                                | Contains                     |
|-------------------------------------|------------------------------|
| `Web App/backend/.env`              | DB creds, JWT secret, PORT   |
| PM2 process env                     | Same as above (loaded at start) |
| Android keystore (local only)       | Release signing key          |
| Apple Developer cert/provisioning   | Managed in Xcode Keychain    |

The `.gitignore` already covers `.env`, `.env.local`, and build
artefacts. Run `git check-ignore -v `<path>` to verify before adding
anything sensitive.

### JWT_SECRET strength requirements

The backend now refuses to start if `JWT_SECRET` is missing, shorter
than 32 characters, or one of a handful of common dev defaults
(`dev-secret-change-me`, `change-me`, `secret`, `password`, `jwt-secret`,
`your-secret-here`). Generate a strong one if yours doesn't meet this
bar:

```bash
openssl rand -base64 48
```

Paste the output into `.env` as `JWT_SECRET=...`, then restart PM2.

---

## 🛡️ After a security-sensitive deploy — rotate secrets

When a deploy includes auth/crypto changes (like the hardening pass
that introduced this section), treat every secret that could have been
known to the old code as compromised and rotate it. Do these on the
VPS, in this order:

### 1. Rotate `JWT_SECRET`
All existing admin + delegate sessions will be invalidated — everyone
has to log in again.

```bash
cd "/opt/fica/Web App/backend"
# Generate and swap in a fresh 48-byte base64 secret
NEW=$(openssl rand -base64 48)
# Back up the current .env just in case
cp .env .env.bak.$(date +%Y%m%d-%H%M%S)
# Replace the JWT_SECRET line (GNU sed)
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW|" .env
# Restart so the new secret is loaded
pm2 restart fica-api
```

### 2. Rotate the MySQL password
```bash
mysql -u root -p
```
```sql
ALTER USER 'fica'@'%' IDENTIFIED BY '<new-strong-password>';
FLUSH PRIVILEGES;
EXIT;
```
Then update `.env` with the new `DATABASE_PASSWORD` and restart PM2.

### 3. Rotate SMTP app password
If you use a Gmail app password, regenerate it in the Google account
and paste into `.env` as `SMTP_PASS`. Restart PM2. Send yourself a
test email from the admin panel's SMTP test button to confirm.

### 4. Confirm secrets aren't in git history
```bash
cd /opt/fica
git log --all --full-history -p -- "Web App/backend/.env"
```
This should return nothing. If it doesn't, rewrite history with
`git filter-repo` and force-push.

### 5. Force every mobile client to upgrade
Step 1 already invalidated mobile session tokens, so the apps will
hit their login screen on next open. If you also shipped a new mobile
build alongside the backend changes:
- iOS: push a TestFlight build, notify testers.
- Android: push an internal-track build in Play Console.

No in-app force-upgrade nag exists today (that's a future add) — relying
on the invalidated JWT to push users through the new login flow is
enough for now.

### 6. Confirm the hardening is live
Run these from your laptop after the restart:

```bash
# Public admin register must be gone — expect 401
curl -sS -X POST -H "Content-Type: application/json" \
     -d '{"email":"evil@x.com","password":"abcd1234"}' \
     https://eventsfiji.cloud/api/register

# Admin endpoint with a delegate JWT must 403
curl -sS -H "Authorization: Bearer <DELEGATE_JWT>" \
     https://eventsfiji.cloud/api/event/speakers

# WebSocket without ?token=… must be rejected
# (use wscat -c 'wss://eventsfiji.cloud/ws' — expect 401 upgrade failure)

# Rate limiter kicks in at request 11
for i in $(seq 1 11); do
  curl -sS -o /dev/null -w "%{http_code}\n" \
    -H "Content-Type: application/json" \
    -d '{"email":"x@y","password":"bad"}' \
    https://eventsfiji.cloud/api/login
done
# → first 10 should be 400 ("Invalid credentials"), 11th should be 429.
```
