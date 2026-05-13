const rateLimit = require('express-rate-limit');

// Limitador general por IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Necesario cuando Express está detrás de un proxy (nginx)
  validate: { xForwardedForHeader: false },
  message: { error: 'Demasiadas solicitudes. Por favor, intentá más tarde.' },
  skip: (req) => req.headers['x-user-tier'] === 'ENTERPRISE'
});

module.exports = limiter;

