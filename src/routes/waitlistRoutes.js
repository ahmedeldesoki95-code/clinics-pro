const { Router } = require('express');
const controller = require('../controllers/waitlistController');

const router = Router();

router.post('/', controller.add);
router.get('/', controller.list);
router.patch('/:id/remove', controller.remove);

module.exports = router;
