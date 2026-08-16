const waitlistService = require('../services/waitlistService');

async function add(req, res) {
  const { clinicId, patientPhone, patientName, desiredDate } = req.body;
  const entry = await waitlistService.addToWaitlist({ clinicId, patientPhone, patientName, desiredDate });
  return res.status(201).json(entry);
}

async function list(req, res) {
  const { clinicId, status } = req.query;
  const entries = await waitlistService.listWaitlist(clinicId, { status });
  return res.json(entries);
}

async function remove(req, res) {
  const entry = await waitlistService.removeFromWaitlist(req.params.id);
  return res.json(entry);
}

module.exports = { add, list, remove };
