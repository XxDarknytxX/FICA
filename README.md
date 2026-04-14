# FICA — Fiji Institute of Chartered Accountants Congress

Full-stack event management platform for the FICA Annual Congress.
Supports both **Congress 2026** (8–9 May 2026, current) and **Congress 2025** (6–7 June 2025, historical).

---

## 📁 Project Structure

```
FICA/
├── Web App/
│   ├── backend/      ← Node.js + Express + MySQL API server
│   └── frontend/     ← React admin panel + delegate portal
├── IOS App/          ← Native iOS app (SwiftUI)
└── Android App/      ← Native Android app (Jetpack Compose / Kotlin)
```

---

## 🌐 Web App (`Web App/`)

### Backend (`Web App/backend/`)

Express REST API with MySQL database and WebSocket messaging.

**Stack:** Node.js, Express, MySQL2, JWT auth, WebSockets (ws)
**API Base:** `/api` (admin) and `/api/delegate` (mobile apps — 7-day JWT)

```bash
cd "Web App/backend"
npm install
# Configure .env with DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, etc.
node src/seed.js        # Seed the DB (Congress 2025 + 2026 data)
node src/server.js      # Run the API on port 5000
```

**Default credentials after seed:**
- Admin: `admin@fica.org.fj` / `abcd1234`
- Delegate: `kritish@fica.com` / `pass123`
- Other delegates: `delegate123`

### Frontend (`Web App/frontend/`)

React 19 + React Router 7 admin panel and delegate portal.

**Stack:** React, Vite, Tailwind CSS, Lucide icons
**Features:** Dashboard, Agenda, Speakers, Sponsors, Networking, Attendees, User Management, Announcements, Settings, Voting

```bash
cd "Web App/frontend"
npm install
npm run dev
```

---

## 📱 iOS App (`IOS App/`)

Native SwiftUI app for delegates.

**Stack:** SwiftUI, Swift Concurrency (async/await), URLSession

**Features:**
- Home dashboard with hero card, stats, upcoming sessions
- **Agenda** with Congress 2026/2025 toggle, themed session groups (Session 1/2/3), day picker, type filters
- Speaker directory (filtered by congress year)
- Networking (directory, connections, messaging, meetings)
- Project voting
- Announcements

Open `IOS App/Events.xcodeproj` in Xcode 16+ to build and run.

---

## 🤖 Android App (`Android App/`)

Native Jetpack Compose app for delegates.

**Stack:** Kotlin, Jetpack Compose, Retrofit, OkHttp, Coil, Compose Navigation

**Features:** Mirrors the iOS app — congress year toggle, themed agenda, networking, voting, announcements.

```bash
cd "Android App"
./gradlew assembleDebug
```

Or open in Android Studio.

---

## 🎨 Session Groups (Agenda)

Both mobile apps organize the agenda into themed groups with colored accents:

| Group | 2026 Theme | 2025 Theme |
|-------|------------|------------|
| Opening Ceremony | Opening Ceremony | Opening Ceremony |
| Session 1 | NAVIGATING: Global Economics & Fiji's Positioning | Balancing Regional and Global Interests |
| Session 2 | TRANSFORMING: AI, Digitalisation & Professional Evolution | Digitalisation and Ease of Doing Business |
| Session 3 | SUSTAINING: Governance, Sustainability & Long-Term Value | Businesses as Catalysts of Economic Growth |
| FICA AGM | Annual General Meeting | Annual General Meeting |
| Social | Cocktail & Theme Dinners | Cocktail & Theme Dinners |

---

## 📍 Venues

- **2026:** Convention Center at Crowne Plaza Fiji Nadi Bay Resort & Spa
- **2025:** Baravi Ballroom at Crowne Plaza Fiji Nadi Bay Resort & Spa
