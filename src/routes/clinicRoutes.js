const { Router } = require('express');
const controller = require('../controllers/clinicController');
const analyticsController = require('../controllers/analyticsController');

const router = Router();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/:id/connect', controller.connect);
router.get('/:id/status', controller.status);
router.post('/:id/disconnect', controller.disconnect);
router.put('/:id/working-hours', controller.updateWorkingHours);
router.get('/:id/analytics', analyticsController.getAnalytics);
router.delete('/:id', controller.remove);

module.exports = router;
