const router = require('express').Router();
const { getMarketTrends, getHeatmap, getInvestmentScore, getNeighborhoodRanking, getMarketOverview } = require('../controllers/analytics.controller');

router.get('/trends', getMarketTrends);
router.get('/heatmap', getHeatmap);
router.get('/score/:neighborhood', getInvestmentScore);
router.get('/ranking', getNeighborhoodRanking);
router.get('/overview', getMarketOverview);

module.exports = router;

