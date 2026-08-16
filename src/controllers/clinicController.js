const QRCode = require('qrcode');
const clinicService = require('../services/clinicService');
const whatsappManager = require('../whatsapp/whatsappManager');

async function create(req, res) {
  const { name, phoneNumber, workingHours, slotDurationMinutes, timezone } = req.body;

  if (!name || !phoneNumber) {
    return res.status(400).json({ error: 'name and phoneNumber are required' });
  }

  const clinic = await clinicService.createClinic({ name, phoneNumber, workingHours, slotDurationMinutes, timezone });
  return res.status(201).json(clinic);
}

async function list(req, res) {
  const clinics = await clinicService.listClinics();
  return res.json(clinics);
}

async function getOne(req, res) {
  const clinic = await clinicService.getClinicById(req.params.id);
  return res.json(clinic);
}

/**
 * Starts a WhatsApp session for the clinic and returns the pairing QR
 * code as a base64 PNG data URL once it becomes available. Polls briefly
 * (max ~15s) so the frontend can render the QR in the same request; if it
 * takes longer, the client should fall back to polling GET /status.
 */
async function connect(req, res) {
  const clinicId = req.params.id;
  await clinicService.getClinicById(clinicId); // 404s if missing

  await whatsappManager.startSession(clinicId);

  const qrRaw = await waitForQrOrConnected(clinicId, 15000);

  if (qrRaw === 'CONNECTED') {
    return res.json({ status: 'CONNECTED', qr: null, message: 'This clinic is already linked to WhatsApp.' });
  }

  if (!qrRaw) {
    return res.status(202).json({
      status: whatsappManager.getStatus(clinicId),
      qr: null,
      message: 'QR not ready yet, please poll GET /api/clinics/:id/status',
    });
  }

  const qrDataUrl = await QRCode.toDataURL(qrRaw);
  return res.json({ status: 'QR_PENDING', qr: qrDataUrl });
}

function waitForQrOrConnected(clinicId, timeoutMs) {
  return new Promise((resolve) => {
    const existingQr = whatsappManager.getLatestQr(clinicId);
    if (whatsappManager.getStatus(clinicId) === 'CONNECTED') {
      return resolve('CONNECTED');
    }
    if (existingQr) {
      return resolve(existingQr);
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    function onQr({ clinicId: id, qr }) {
      if (id !== clinicId) return;
      cleanup();
      resolve(qr);
    }
    function onConnected({ clinicId: id }) {
      if (id !== clinicId) return;
      cleanup();
      resolve('CONNECTED');
    }
    function cleanup() {
      clearTimeout(timeout);
      whatsappManager.off('qr', onQr);
      whatsappManager.off('connected', onConnected);
    }

    whatsappManager.on('qr', onQr);
    whatsappManager.on('connected', onConnected);
  });
}

async function status(req, res) {
  const clinicId = req.params.id;
  const clinic = await clinicService.getClinicById(clinicId);
  return res.json({
    clinicId,
    status: whatsappManager.getStatus(clinicId) || clinic.sessionStatus,
  });
}

async function disconnect(req, res) {
  const clinicId = req.params.id;
  await clinicService.getClinicById(clinicId);
  const logout = req.query.logout === 'true';
  await whatsappManager.stopSession(clinicId, { logout });
  return res.json({ clinicId, status: logout ? 'LOGGED_OUT' : 'DISCONNECTED' });
}

async function updateWorkingHours(req, res) {
  const clinicId = req.params.id;
  const { workingHours, slotDurationMinutes } = req.body;
  if (!workingHours) {
    return res.status(400).json({ error: 'workingHours is required' });
  }
  const clinic = await clinicService.updateWorkingHours(clinicId, workingHours, slotDurationMinutes);
  return res.json(clinic);
}

async function remove(req, res) {
  const clinicId = req.params.id;
  await whatsappManager.stopSession(clinicId, { logout: true }).catch(() => {});
  await clinicService.deleteClinic(clinicId);
  return res.status(204).send();
}

module.exports = { create, list, getOne, connect, status, disconnect, updateWorkingHours, remove };
