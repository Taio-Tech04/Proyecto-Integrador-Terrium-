module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'change_me_in_production',
  LISTINGS_URL: process.env.LISTINGS_URL || 'http://localhost:3001',
  VALUATIONS_URL: process.env.VALUATIONS_URL || 'http://localhost:3002',
  ANALYTICS_URL: process.env.ANALYTICS_URL || 'http://localhost:3003',
  NOTIFICATIONS_URL: process.env.NOTIFICATIONS_URL || 'http://localhost:3004',
  USERS_URL: process.env.USERS_URL || 'http://localhost:3005',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
