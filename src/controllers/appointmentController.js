const appointmentService = require('../services/appointmentService');
const clinicService = require('../services/clinicService');

async function list(req, res) {
  const { clinicId, status, from, to, patientPhone } = req.query;
  const appointments = await appointmentService.listAppointments({ clinicId, status, from, to, patientPhone });
  return res.json(appointments);
}

async function getAvailableSlots(req, res) {
  const { clinicId } = req.query;
  if (!clinicId) {
    return res.status(400).json({ error: 'clinicId query param is required' });
  }
  const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead, 10) : 7;
  const days = await appointmentService.getAvailableSlots(clinicId, { daysAhead });
  return res.json(days);
}

/**
 * Defines / updates a clinic's working hours and slot duration.
 * Maps to the required POST /api/appointments/slots endpoint.
 * Body: { clinicId, workingHours: { mon: [{start,end}], ... }, slotDurationMinutes }
 */
async function defineSlots(req, res) {
  const { clinicId, workingHours, slotDurationMinutes } = req.body;
  if (!clinicId || !workingHours) {
    return res.status(400).json({ error: 'clinicId and workingHours are required' });
  }
  const clinic = await clinicService.updateWorkingHours(clinicId, workingHours, slotDurationMinutes);
  return res.status(200).json(clinic);
}

async function book(req, res) {
  const { clinicId, patientPhone, patientName, appointmentTime } = req.body;
  if (!clinicId || !patientPhone || !patientName || !appointmentTime) {
    return res.status(400).json({ error: 'clinicId, patientPhone, patientName and appointmentTime are required' });
  }
  const appointment = await appointmentService.bookAppointment({ clinicId, patientPhone, patientName, appointmentTime });
  return res.status(201).json(appointment);
}

async function confirm(req, res) {
  const appointment = await appointmentService.confirmAppointment(req.params.id);
  return res.json(appointment);
}

async function cancel(req, res) {
  const appointment = await appointmentService.cancelAppointment(req.params.id);
  return res.json(appointment);
}

async function reschedule(req, res) {
  const { appointmentTime } = req.body;
  if (!appointmentTime) {
    return res.status(400).json({ error: 'appointmentTime is required' });
  }
  const appointment = await appointmentService.rescheduleAppointment(req.params.id, appointmentTime);
  return res.json(appointment);
}

module.exports = { list, getAvailableSlots, defineSlots, book, confirm, cancel, reschedule };
