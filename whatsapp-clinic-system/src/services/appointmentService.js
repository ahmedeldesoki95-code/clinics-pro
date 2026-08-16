const { prisma } = require('../config/db');
const { addDays, startOfDay, endOfDay } = require('date-fns');
const { generateSlotsForDay, filterOutBookedSlots } = require('../utils/slotHelper');
const { getClinicById } = require('./clinicService');

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'];

/**
 * Returns available bookable slots for a clinic across the next `daysAhead`
 * calendar days (default 7), excluding slots already taken by an active
 * (PENDING/CONFIRMED) appointment.
 */
async function getAvailableSlots(clinicId, { daysAhead = 7, fromDate = new Date() } = {}) {
  const clinic = await getClinicById(clinicId);

  const rangeStart = startOfDay(fromDate);
  const rangeEnd = endOfDay(addDays(fromDate, daysAhead - 1));

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: { in: ACTIVE_STATUSES },
      appointmentTime: { gte: rangeStart, lte: rangeEnd },
    },
    select: { appointmentTime: true },
  });
  const bookedTimes = bookedAppointments.map((a) => a.appointmentTime);

  const days = [];
  for (let i = 0; i < daysAhead; i += 1) {
    const day = addDays(fromDate, i);
    const raw = generateSlotsForDay(clinic, day, new Date());
    const available = filterOutBookedSlots(raw, bookedTimes);
    if (available.length > 0) {
      days.push({ date: startOfDay(day), slots: available });
    }
  }

  return days;
}

/**
 * Books an appointment with strict conflict prevention.
 * Relies on the DB-level unique constraint (clinicId + appointmentTime) as
 * the ultimate source of truth, so even two simultaneous requests for the
 * same slot cannot both succeed (the second will hit a P2002 violation).
 */
async function bookAppointment({ clinicId, patientPhone, patientName, appointmentTime }) {
  const clinic = await getClinicById(clinicId);

  const slotDate = new Date(appointmentTime);
  if (Number.isNaN(slotDate.getTime())) {
    const err = new Error('Invalid appointment time');
    err.statusCode = 400;
    throw err;
  }
  if (slotDate.getTime() < Date.now()) {
    const err = new Error('Cannot book a slot in the past');
    err.statusCode = 400;
    throw err;
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          clinicId,
          appointmentTime: slotDate,
          status: { in: ACTIVE_STATUSES },
        },
      });
      if (conflict) {
        const err = new Error('This time slot has just been booked. Please choose another.');
        err.statusCode = 409;
        throw err;
      }

      return tx.appointment.create({
        data: {
          clinicId,
          patientPhone,
          patientName,
          appointmentTime: slotDate,
          status: 'PENDING',
        },
      });
    });

    return appointment;
  } catch (err) {
    // Unique constraint race condition fallback (clinicId + appointmentTime)
    if (err.code === 'P2002') {
      const conflictErr = new Error('This time slot has just been booked. Please choose another.');
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw err;
  }
}

async function confirmAppointment(appointmentId) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CONFIRMED' },
  });
}

async function cancelAppointment(appointmentId) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED' },
  });
}

async function rescheduleAppointment(appointmentId, newTime) {
  const slotDate = new Date(newTime);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!existing) {
      const err = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }

    const conflict = await tx.appointment.findFirst({
      where: {
        clinicId: existing.clinicId,
        appointmentTime: slotDate,
        status: { in: ACTIVE_STATUSES },
        NOT: { id: appointmentId },
      },
    });
    if (conflict) {
      const err = new Error('This time slot has just been booked. Please choose another.');
      err.statusCode = 409;
      throw err;
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { appointmentTime: slotDate, status: 'PENDING', reminderDaySent: false, reminder2hSent: false },
    });
  });
}

async function findLatestActiveAppointmentForPatient(clinicId, patientPhone) {
  return prisma.appointment.findFirst({
    where: {
      clinicId,
      patientPhone,
      status: { in: ACTIVE_STATUSES },
      appointmentTime: { gte: new Date() },
    },
    orderBy: { appointmentTime: 'asc' },
  });
}

async function listAppointments({ clinicId, status, from, to, patientPhone } = {}) {
  return prisma.appointment.findMany({
    where: {
      ...(clinicId ? { clinicId } : {}),
      ...(status ? { status } : {}),
      ...(patientPhone ? { patientPhone } : {}),
      ...(from || to
        ? {
            appointmentTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { appointmentTime: 'asc' },
    include: { clinic: { select: { name: true, phoneNumber: true } } },
  });
}

async function findAppointmentsForReminders({ dayWindowStart, dayWindowEnd, hourWindowStart, hourWindowEnd }) {
  const dayCandidates = await prisma.appointment.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      reminderDaySent: false,
      appointmentTime: { gte: dayWindowStart, lte: dayWindowEnd },
    },
    include: { clinic: true },
  });

  const hourCandidates = await prisma.appointment.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      reminder2hSent: false,
      appointmentTime: { gte: hourWindowStart, lte: hourWindowEnd },
    },
    include: { clinic: true },
  });

  return { dayCandidates, hourCandidates };
}

async function markReminderSent(appointmentId, field) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { [field]: true },
  });
}

module.exports = {
  getAvailableSlots,
  bookAppointment,
  confirmAppointment,
  cancelAppointment,
  rescheduleAppointment,
  findLatestActiveAppointmentForPatient,
  listAppointments,
  findAppointmentsForReminders,
  markReminderSent,
};
