const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: 'info',
  format: config.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()]
});

module.exports = logger;

