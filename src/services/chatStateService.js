const { prisma } = require('../config/db');

async function getState(clinicId, patientPhone) {
  let state = await prisma.chatState.findUnique({
    where: { patientPhone_clinicId: { patientPhone, clinicId } },
  });

  if (!state) {
    state = await prisma.chatState.create({
      data: { clinicId, patientPhone, currentStep: 'IDLE', metadata: {} },
    });
  }

  return state;
}

async function setState(clinicId, patientPhone, currentStep, metadata = {}) {
  return prisma.chatState.upsert({
    where: { patientPhone_clinicId: { patientPhone, clinicId } },
    update: { currentStep, metadata },
    create: { clinicId, patientPhone, currentStep, metadata },
  });
}

async function mergeMetadata(clinicId, patientPhone, partialMetadata) {
  const current = await getState(clinicId, patientPhone);
  const merged = { ...(current.metadata || {}), ...partialMetadata };
  return prisma.chatState.update({
    where: { patientPhone_clinicId: { patientPhone, clinicId } },
    data: { metadata: merged },
  });
}

async function resetState(clinicId, patientPhone) {
  return setState(clinicId, patientPhone, 'IDLE', {});
}

module.exports = { getState, setState, mergeMetadata, resetState };
