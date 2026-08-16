const { Router } = require('express');
const controller = require('../controllers/appointmentController');

const router = Router();

router.get('/', controller.list);
router.get('/available', controller.getAvailableSlots);
router.post('/slots', controller.defineSlots);
router.post('/', controller.book);
router.patch('/:id/confirm', controller.confirm);
router.patch('/:id/cancel', controller.cancel);
router.patch('/:id/reschedule', controller.reschedule);

module.exports = router;
