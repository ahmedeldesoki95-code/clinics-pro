const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { prisma } = require('../config/db');

function sessionPathFor(clinicId) {
  return path.resolve(process.cwd(), env.sessionsDir, `clinic_${clinicId}`);
}

function ensureSessionDir(clinicId) {
  const dir = sessionPathFor(clinicId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function removeSessionDir(clinicId) {
  const dir = sessionPathFor(clinicId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function persistStatus(clinicId, status) {
  await prisma.clinic.update({
    where: { id: clinicId },
    data: { sessionStatus: status },
  }).catch(() => {
    // Clinic may have been deleted mid-flight; safe to ignore.
  });
}

module.exports = {
  sessionPathFor,
  ensureSessionDir,
  removeSessionDir,
  persistStatus,
};
