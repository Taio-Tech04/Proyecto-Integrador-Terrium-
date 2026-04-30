const router = require('express').Router();
const { getPlans, getMySubscription, upgrade } = require('../controllers/subscription.controller');

router.get('/plans', getPlans);
router.get('/my-subscription', getMySubscription);
router.post('/upgrade', upgrade);

module.exports = router;

