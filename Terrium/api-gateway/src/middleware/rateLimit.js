const rateLimit = require('express-rate-limit');

// Limitador general por IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Por favor, intentá más tarde.' },
  skip: (req) => {
    // Los planes superiores tienen más requests
    const tier = req.headers['x-user-tier'];
    if (tier === 'ENTERPRISE') return true;
    return false;
  }
});

module.exports = limiter;

