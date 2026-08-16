# Multi-Clinic WhatsApp Automation & Appointment System

Production-ready Node.js backend that connects multiple clinics to WhatsApp
(via Baileys), runs an automated booking chatbot, prevents double-booking,
and sends scheduled reminders that patients can confirm/cancel by replying
`1` or `2`.

## Stack
- **Express** — REST API
- **@whiskeysockets/baileys** — multi-session WhatsApp Web sockets
- **PostgreSQL + Prisma** — database & ORM
- **node-cron** — scheduled reminder sweeps
- **pino** — structured logging

## Project Structure
```
whatsapp-clinic-system/
├── prisma/
│   └── schema.prisma          # Clinic, Appointment, ChatState models
├── sessions/                  # Baileys auth state per clinic (gitignored)
├── src/
│   ├── config/
│   │   ├── env.js             # env var loader/validator
│   │   └── db.js              # Prisma client singleton
│   ├── whatsapp/
│   │   ├── whatsappManager.js # multi-session socket manager, QR, reconnect
│   │   ├── sessionStore.js    # session folder + status persistence helpers
│   │   └── messageSender.js   # anti-ban delayed sending
│   ├── services/
│   │   ├── clinicService.js
│   │   ├── appointmentService.js  # slot generation + conflict-safe booking
│   │   ├── chatStateService.js    # per-patient state machine storage
│   │   └── bookingEngine.js       # chatbot state machine logic
│   ├── controllers/
│   │   ├── clinicController.js
│   │   └── appointmentController.js
│   ├── routes/
│   │   ├── clinicRoutes.js
│   │   └── appointmentRoutes.js
│   ├── jobs/
│   │   ├── reminderJob.js     # finds due appointments, sends reminders
│   │   └── scheduler.js       # node-cron wiring
│   ├── middlewares/
│   │   └── errorHandler.js
│   └── server.js              # app bootstrap
├── package.json
└── .env.example
```

## Setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL etc.
npx prisma migrate dev --name init
npm run dev                # or: npm start
```

## Connecting a Clinic to WhatsApp

1. `POST /api/clinics` with `{ "name": "STEP Gym Clinic", "phoneNumber": "201234567890", "workingHours": { "mon": [{"start":"09:00","end":"21:00"}] } }`
2. `POST /api/clinics/:id/connect` → returns a base64 QR data URL (`qr` field). Render it as an `<img src="...">` in your frontend and scan with WhatsApp → Linked Devices.
3. Poll `GET /api/clinics/:id/status` until `status` is `CONNECTED`.

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | `/api/clinics` | Create a clinic |
| GET | `/api/clinics` | List clinics |
| GET | `/api/clinics/:id` | Get one clinic |
| POST | `/api/clinics/:id/connect` | Start WhatsApp session, get QR |
| GET | `/api/clinics/:id/status` | Get connection status |
| POST | `/api/clinics/:id/disconnect?logout=true|false` | Stop session |
| PUT | `/api/clinics/:id/working-hours` | Update working hours / slot duration |
| DELETE | `/api/clinics/:id` | Delete clinic & wipe session |
| GET | `/api/appointments?clinicId=...` | List appointments |
| GET | `/api/appointments/available?clinicId=...&daysAhead=7` | List open slots |
| POST | `/api/appointments/slots` | Define/replace working hours (per requirements) |
| POST | `/api/appointments` | Manually book an appointment |
| PATCH | `/api/appointments/:id/confirm` | Confirm |
| PATCH | `/api/appointments/:id/cancel` | Cancel |
| PATCH | `/api/appointments/:id/reschedule` | Reschedule (body: `appointmentTime`) |

## Patient Chat Flow (WhatsApp side)

```
Patient: hi
Bot: Welcome! 1) Book  2) View  3) Cancel  4) Reschedule
Patient: 1
Bot: Choose a day: 1) Mon 18 Aug ...
Patient: 1
Bot: Choose a time: 1) 10:00 AM ...
Patient: 1
Bot: What name should we book this under?
Patient: Ahmed
Bot: Confirm? 1) Yes 2) No
Patient: 1
Bot: ✅ Confirmed for Mon 18 Aug, 10:00 AM
```

## Key Production Guarantees

- **No double-booking**: booking runs inside a DB transaction that re-checks
  for conflicts, plus a hard unique constraint (`clinicId + appointmentTime`)
  as the final safety net — even simultaneous requests can't both succeed.
- **Anti-ban delay**: every outbound bot message waits a randomized
  2–5s (configurable) and simulates "typing" presence before sending.
- **Memory-safe sockets**: `whatsappManager` removes all Baileys event
  listeners (`sock.ev.removeAllListeners()`) whenever a session is stopped
  or reconnected, so repeated reconnects never leak listeners.
- **Exponential backoff reconnects**: unexpected disconnects retry with
  `min(1000 * 2^attempt, 60000)` ms delay; a `loggedOut` disconnect instead
  wipes the session and requires a fresh QR scan.
- **Session resume on boot**: `server.js` re-starts sockets for any clinic
  that was previously connected, so a server restart doesn't force
  everyone to re-scan QR codes.

---

## v2 Additions: Waitlist Engine, Analytics, Admin Dashboard

### Automated Waitlist Engine
- `POST /api/waitlist` `{ clinicId, patientPhone, patientName, desiredDate }` — join the waitlist for a calendar date.
- `GET /api/waitlist?clinicId=...&status=WAITING` — list entries.
- `PATCH /api/waitlist/:id/remove` — withdraw a patient from the list.
- When `appointmentService.cancelAppointment()` runs, it now fires `waitlistService.notifyNextCandidate()`, which finds the oldest `WAITING` entry for that clinic + date and messages them on WhatsApp with a 15-minute claim window.
- Claiming happens through the same chatbot state machine: replying `1` while in the `AWAITING_WAITLIST_RESPONSE` step re-assigns the previously-cancelled appointment row to the claimant (`waitlistService.claimSlot`).
- A dedicated `node-cron` sweep (registered in `jobs/scheduler.js`, runs every minute) expires stale offers and automatically advances to the next person in line — this covers patients who never reply at all, not just ones who reply "no".

### Analytics & Financial Reports
- `GET /api/clinics/:id/analytics?from=...&to=...` (defaults to the trailing 30 days) returns:
  - `attendanceRate`, `cancellationRate`, `noShowRate` (based on COMPLETED / CANCELLED / NO_SHOW appointments)
  - `revenue` — sums `appointment.price` (falls back to the clinic's `defaultPrice`) across COMPLETED appointments
  - `peakHours` — top 5 busiest hours of the day
  - `dailySummary` / `weeklySummary` — chart-ready time series
- New Prisma fields: `Clinic.defaultPrice` and `Appointment.price` (nullable override per visit) power the revenue calculation — set these via the working-hours update endpoint or directly when booking.

### Clinic Admin Dashboard (`/frontend`)
A Vite + React + Tailwind + `lucide-react` + `recharts` SPA that talks to the same REST API:

```
frontend/
├── src/
│   ├── App.jsx                     # clinic switcher + tab nav
│   ├── components/
│   │   ├── DashboardOverview.jsx   # stat cards + WhatsApp status + QR modal
│   │   ├── QrCodeModal.jsx         # live QR polling modal
│   │   ├── ScheduleManager.jsx     # day/week calendar, confirm/cancel/reschedule
│   │   ├── WaitlistManager.jsx     # add/view/remove waitlist entries
│   │   ├── AnalyticsTab.jsx        # charts: attendance, revenue, peak hours
│   │   └── StatusBadge.jsx
│   ├── lib/api.js                  # fetch wrapper for the backend REST API
│   ├── lib/format.js
│   └── hooks/usePolling.js         # lightweight polling hook (status/QR/lists)
├── tailwind.config.js              # clinic.bg / clinic.ink / clinic.teal / clinic.coral tokens
└── vite.config.js
```

**Run it:**
```bash
cd frontend
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm run dev
```

The dashboard polls the REST API (no websockets needed) — appointments and clinic status refresh every 5–15s, analytics every 60s, and the QR modal polls every 3s until the clinic connects.

