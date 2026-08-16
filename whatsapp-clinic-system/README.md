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
