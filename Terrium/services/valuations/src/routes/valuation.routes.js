const router = require('express').Router();
const { getByProperty, getPriceHistory, estimate } = require('../controllers/valuation.controller');
router.get('/property/:id', getByProperty);
router.get('/history/:neighborhood', getPriceHistory);
router.post('/estimate', estimate);
module.exports = router;
