const { addDays, addHours, startOfDay, endOfDay } = require('date-fns');
const logger = require('../utils/logger');
const env = require('../config/env');
const appointmentService = require('../services/appointmentService');
const chatStateService = require('../services/chatStateService');
const whatsappManager = require('../whatsapp/whatsappManager');
const { sendTextMessage, phoneToJid } = require('../whatsapp/messageSender');
const { formatSlotLabel } = require('../utils/slotHelper');

/**
 * Finds appointments that are due for a "day-before" reminder or a
 * "N hours before" reminder, and sends them via each clinic's own
 * connected WhatsApp socket. Skips clinics whose session isn't currently
 * connected (their appointments will be picked up on the next run once
 * reconnected).
 */
async function runReminderSweep() {
  const now = new Date();

  const dayWindowStart = startOfDay(addDays(now, 1));
  const dayWindowEnd = endOfDay(addDays(now, 1));

  const hourWindowStart = now;
  const hourWindowEnd = addHours(now, env.reminderWindowHours);

  const { dayCandidates, hourCandidates } = await appointmentService.findAppointmentsForReminders({
    dayWindowStart,
    dayWindowEnd,
    hourWindowStart,
    hourWindowEnd,
  });

  logger.info(
    { dayCandidates: dayCandidates.length, hourCandidates: hourCandidates.length },
    'Reminder sweep started'
  );

  for (const appt of dayCandidates) {
    await sendReminder(appt, 'DAY_BEFORE');
  }

  for (const appt of hourCandidates) {
    // Avoid double-sending if an appointment happens to qualify for both
    // windows (e.g. very short-notice booking made the same day it's due).
    if (dayCandidates.some((d) => d.id === appt.id)) continue;
    await sendReminder(appt, 'HOURS_BEFORE');
  }
}

async function sendReminder(appointment, kind) {
  const sock = whatsappManager.getSocket(appointment.clinicId);
  if (!sock) {
    logger.warn({ clinicId: appointment.clinicId }, 'Skipping reminder — clinic WhatsApp not connected');
    return;
  }

  const jid = phoneToJid(appointment.patientPhone);
  const label = formatSlotLabel(appointment.appointmentTime);

  const message =
    kind === 'DAY_BEFORE'
      ? `👋 Hi ${appointment.patientName}, this is a reminder from ${appointment.clinic.name} that you have an appointment tomorrow at ${label}.\n\n1️⃣ Confirm\n2️⃣ Cancel`
      : `⏰ Hi ${appointment.patientName}, your appointment at ${appointment.clinic.name} is coming up at ${label} (in about ${env.reminderWindowHours} hours).\n\n1️⃣ Confirm\n2️⃣ Cancel`;

  try {
    await sendTextMessage(sock, jid, message);

    await chatStateService.setState(appointment.clinicId, appointment.patientPhone, 'AWAITING_REMINDER_RESPONSE', {
      appointmentId: appointment.id,
    });

    const field = kind === 'DAY_BEFORE' ? 'reminderDaySent' : 'reminder2hSent';
    await appointmentService.markReminderSent(appointment.id, field);

    logger.info({ appointmentId: appointment.id, kind }, 'Reminder sent');
  } catch (err) {
    logger.error({ err, appointmentId: appointment.id }, 'Failed to send reminder');
  }
}

module.exports = { runReminderSweep };
