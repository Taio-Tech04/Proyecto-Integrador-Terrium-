const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:4000'];

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEV_JWT_FALLBACK = 'change_me_in_production';

// En producción exigimos un secreto fuerte y propio; en dev/test se permite el
// fallback para no romper el arranque local ni los tests.
function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (NODE_ENV === 'production') {
    if (!secret || secret === DEV_JWT_FALLBACK) {
      throw new Error(
        'JWT_SECRET no está configurado (o usa el valor por defecto). Definí un secreto propio en producción.'
      );
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
    }
  }
  return secret || DEV_JWT_FALLBACK;
}

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: resolveJwtSecret(),
  LISTINGS_URL: process.env.LISTINGS_URL || 'http://localhost:3001',
  VALUATIONS_URL: process.env.VALUATIONS_URL || 'http://localhost:3002',
  ANALYTICS_URL: process.env.ANALYTICS_URL || 'http://localhost:3003',
  NOTIFICATIONS_URL: process.env.NOTIFICATIONS_URL || 'http://localhost:3004',
  USERS_URL: process.env.USERS_URL || 'http://localhost:3005',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS,
};
