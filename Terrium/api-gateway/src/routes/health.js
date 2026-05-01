const axios = require('axios');
const config = require('../config');
const router = require('express').Router();

router.get('/', async (req, res) => {
  const services = {
    users: config.USERS_URL,
    listings: config.LISTINGS_URL,
    valuations: config.VALUATIONS_URL,
    analytics: config.ANALYTICS_URL,
    notifications: config.NOTIFICATIONS_URL
  };

  const statuses = {};
  for (const [name, url] of Object.entries(services)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      statuses[name] = 'ok';
    } catch {
      statuses[name] = 'unavailable';
    }
  }

  const allOk = Object.values(statuses).every((s) => s === 'ok');
  res.status(allOk ? 200 : 207).json({
    gateway: 'ok',
    services: statuses,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

