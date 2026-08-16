const { prisma } = require('../config/db');

async function createClinic({ name, phoneNumber, workingHours, slotDurationMinutes, timezone }) {
  return prisma.clinic.create({
    data: {
      name,
      phoneNumber,
      workingHours: workingHours || {},
      slotDurationMinutes: slotDurationMinutes || 30,
      timezone: timezone || 'Africa/Cairo',
    },
  });
}

async function listClinics() {
  return prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } });
}

async function getClinicById(clinicId) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    const err = new Error('Clinic not found');
    err.statusCode = 404;
    throw err;
  }
  return clinic;
}

async function updateWorkingHours(clinicId, workingHours, slotDurationMinutes) {
  await getClinicById(clinicId);
  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      workingHours,
      ...(slotDurationMinutes ? { slotDurationMinutes } : {}),
    },
  });
}

async function updateSessionStatus(clinicId, sessionStatus) {
  return prisma.clinic.update({ where: { id: clinicId }, data: { sessionStatus } });
}

async function deleteClinic(clinicId) {
  await getClinicById(clinicId);
  return prisma.clinic.delete({ where: { id: clinicId } });
}

module.exports = {
  createClinic,
  listClinics,
  getClinicById,
  updateWorkingHours,
  updateSessionStatus,
  deleteClinic,
};
