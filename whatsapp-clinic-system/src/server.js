require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDb, disconnectDb, prisma } = require('./config/db');

const whatsappManager = require('./whatsapp/whatsappManager');
const { handleIncomingMessage } = require('./services/bookingEngine');

const clinicRoutes = require('./routes/clinicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { startScheduler, stopScheduler } = require('./jobs/scheduler');

// Wire the chatbot state machine as the handler for every incoming WhatsApp message,
// across every clinic session managed by whatsappManager.
whatsappManager.setMessageHandler(handleIncomingMessage);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/clinics', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;

async function bootstrap() {
  await connectDb();
  await resumeActiveClinicSessions();
  startScheduler();

  server = app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
}

/**
 * On process start, automatically re-establish WhatsApp sockets for any
 * clinic that was previously connected (has saved auth creds), so a server
 * restart doesn't force every clinic to re-scan a QR code.
 */
async function resumeActiveClinicSessions() {
  const clinics = await prisma.clinic.findMany({
    where: { sessionStatus: { in: ['CONNECTED', 'CONNECTING', 'QR_PENDING'] } },
  });

  for (const clinic of clinics) {
    whatsappManager.startSession(clinic.id).catch((err) => {
      logger.error({ err, clinicId: clinic.id }, 'Failed to resume WhatsApp session on boot');
    });
  }
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');
  stopScheduler();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  const sessions = Array.from(whatsappManager.sessions.keys());
  await Promise.all(sessions.map((clinicId) => whatsappManager.stopSession(clinicId, { logout: false })));

  await disconnectDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});

module.exports = app;
