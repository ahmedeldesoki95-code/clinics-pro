const { startOfDay } = require('date-fns');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const whatsappManager = require('../whatsapp/whatsappManager');
const { sendTextMessage, phoneToJid } = require('../whatsapp/messageSender');
const { formatSlotLabel } = require('../utils/slotHelper');
const chatStateService = require('./chatStateService');

const CLAIM_WINDOW_MINUTES = 15;

/**
 * Adds a patient to the waitlist for a given calendar date at a clinic.
 * `desiredDate` may be any Date/ISO string within the day they want —
 * it is normalized to the start of that day for matching purposes.
 */
async function addToWaitlist({ clinicId, patientPhone, patientName, desiredDate }) {
  if (!clinicId || !patientPhone || !patientName || !desiredDate) {
    const err = new Error('clinicId, patientPhone, patientName and desiredDate are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedDate = startOfDay(new Date(desiredDate));
  if (Number.isNaN(normalizedDate.getTime())) {
    const err = new Error('Invalid desiredDate');
    err.statusCode = 400;
    throw err;
  }

  return prisma.waitlist.create({
    data: {
      clinicId,
      patientPhone,
      patientName,
      desiredDate: normalizedDate,
      status: 'WAITING',
    },
  });
}

async function listWaitlist(clinicId, { status } = {}) {
  return prisma.waitlist.findMany({
    where: {
      ...(clinicId ? { clinicId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function removeFromWaitlist(waitlistId) {
  return prisma.waitlist.update({
    where: { id: waitlistId },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Entry point called right after an appointment is cancelled.
 * Finds the oldest still-WAITING patient for that clinic + calendar date
 * and offers them the freed slot with a 15-minute claim window.
 * Safe to call even if no one is waiting (no-op).
 */
async function notifyNextCandidate(freedAppointment) {
  const { clinicId, id: appointmentId, appointmentTime, patientName: previousPatientName } = freedAppointment;
  const desiredDate = startOfDay(new Date(appointmentTime));

  const candidate = await prisma.waitlist.findFirst({
    where: { clinicId, desiredDate, status: 'WAITING' },
    orderBy: { createdAt: 'asc' },
  });

  if (!candidate) {
    logger.info({ clinicId, appointmentId }, 'No waitlist candidates for freed slot');
    return null;
  }

  return offerSlotToCandidate(candidate, freedAppointment);
}

async function offerSlotToCandidate(candidate, freedAppointment) {
  const sock = whatsappManager.getSocket(freedAppointment.clinicId);
  if (!sock) {
    logger.warn({ clinicId: freedAppointment.clinicId }, 'Cannot notify waitlist candidate — clinic WhatsApp not connected');
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_WINDOW_MINUTES * 60 * 1000);
  const label = formatSlotLabel(freedAppointment.appointmentTime);

  const updated = await prisma.waitlist.update({
    where: { id: candidate.id },
    data: {
      status: 'NOTIFIED',
      notifiedAt: now,
      expiresAt,
      offeredAppointmentId: freedAppointment.id,
      offeredSlotTime: freedAppointment.appointmentTime,
    },
  });

  const jid = phoneToJid(candidate.patientPhone);
  const message = `🎉 A slot just opened up for ${label}!\n\nReply "1" within ${CLAIM_WINDOW_MINUTES} minutes to claim this slot. It will be offered to the next person on the waitlist if you don't respond in time.`;

  try {
    await sendTextMessage(sock, jid, message);
    await chatStateService.setState(freedAppointment.clinicId, candidate.patientPhone, 'AWAITING_WAITLIST_RESPONSE', {
      waitlistId: candidate.id,
      appointmentId: freedAppointment.id,
      expiresAt: expiresAt.toISOString(),
    });
    logger.info({ waitlistId: candidate.id, appointmentId: freedAppointment.id }, 'Waitlist candidate notified');
  } catch (err) {
    logger.error({ err, waitlistId: candidate.id }, 'Failed to notify waitlist candidate');
  }

  return updated;
}

/**
 * Handles a patient's reply while their chat state is
 * AWAITING_WAITLIST_RESPONSE. Reply "1" claims the slot (if still within
 * the window and still offered to them); anything else, or an expired
 * window, releases the slot to the next candidate.
 */
async function handleWaitlistReply({ clinicId, patientPhone, text, sock, remoteJid }) {
  const waitlistEntry = await prisma.waitlist.findFirst({
    where: { clinicId, patientPhone, status: 'NOTIFIED' },
    orderBy: { notifiedAt: 'desc' },
  });

  if (!waitlistEntry) {
    return { handled: false };
  }

  const isExpired = waitlistEntry.expiresAt && new Date() > new Date(waitlistEntry.expiresAt);
  const choice = text.trim();

  if (isExpired) {
    await expireAndAdvance(waitlistEntry);
    await sendTextMessage(sock, remoteJid, '⏰ Sorry, the claim window for that slot has expired and it was offered to the next patient on the list.');
    await chatStateService.resetState(clinicId, patientPhone);
    return { handled: true };
  }

  if (choice === '1') {
    const claimed = await claimSlot(waitlistEntry);
    if (claimed.conflict) {
      await sendTextMessage(sock, remoteJid, '😔 Sorry, that slot is no longer available.');
    } else {
      await sendTextMessage(
        sock,
        remoteJid,
        `✅ Your slot is confirmed for ${formatSlotLabel(claimed.appointment.appointmentTime)}. We look forward to seeing you!`
      );
    }
    await chatStateService.resetState(clinicId, patientPhone);
    return { handled: true };
  }

  await sendTextMessage(sock, remoteJid, 'Please reply with "1" to claim this slot, or ignore this message to let it pass to the next patient.');
  return { handled: true };
}

async function claimSlot(waitlistEntry) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: waitlistEntry.offeredAppointmentId } });

    if (!appointment || appointment.status !== 'CANCELLED') {
      await tx.waitlist.update({ where: { id: waitlistEntry.id }, data: { status: 'EXPIRED' } });
      return { conflict: true };
    }

    const updatedAppointment = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        patientPhone: waitlistEntry.patientPhone,
        patientName: waitlistEntry.patientName,
        status: 'CONFIRMED',
        reminderDaySent: false,
        reminder2hSent: false,
      },
    });

    await tx.waitlist.update({ where: { id: waitlistEntry.id }, data: { status: 'CLAIMED' } });

    return { conflict: false, appointment: updatedAppointment };
  });
}

async function expireAndAdvance(waitlistEntry) {
  await prisma.waitlist.update({ where: { id: waitlistEntry.id }, data: { status: 'EXPIRED' } });

  const appointment = await prisma.appointment.findUnique({ where: { id: waitlistEntry.offeredAppointmentId } });
  if (appointment && appointment.status === 'CANCELLED') {
    await notifyNextCandidate(appointment);
  }
}

/**
 * Cron-driven sweep (registered in jobs/scheduler.js) that catches
 * NOTIFIED waitlist entries whose 15-minute window lapsed without a reply
 * (i.e. the patient never responded at all), expiring them and advancing
 * the offer to the next person in line.
 */
async function expireStaleNotifications() {
  const stale = await prisma.waitlist.findMany({
    where: { status: 'NOTIFIED', expiresAt: { lt: new Date() } },
  });

  for (const entry of stale) {
    logger.info({ waitlistId: entry.id }, 'Expiring stale waitlist notification');
    await expireAndAdvance(entry);
    await chatStateService.resetState(entry.clinicId, entry.patientPhone).catch(() => {});
  }

  return stale.length;
}

module.exports = {
  addToWaitlist,
  listWaitlist,
  removeFromWaitlist,
  notifyNextCandidate,
  handleWaitlistReply,
  expireStaleNotifications,
};
