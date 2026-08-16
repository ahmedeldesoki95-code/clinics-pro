const analyticsService = require('../services/analyticsService');

async function getAnalytics(req, res) {
  const clinicId = req.params.id;
  const { from, to } = req.query;
  const analytics = await analyticsService.getClinicAnalytics(clinicId, { from, to });
  return res.json(analytics);
}

module.exports = { getAnalytics };
