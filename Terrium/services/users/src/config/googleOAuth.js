const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Estrategia Google OAuth 2.0.
 * Flujo:
 *  1. Usuario hace GET /auth/google → redirigido a Google
 *  2. Google autentica y redirige a /auth/google/callback con un `code`
 *  3. Passport intercambia el code por perfil del usuario
 *  4. Si el usuario no existe, se crea automáticamente (tier FREE)
 *  5. Se genera un JWT y se redirige al frontend con ?token=...
 */
function configureGoogleOAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth no configurado — GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET faltantes');
    return;
  }

  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('Google no retornó un email válido'));

        // Buscar usuario existente por email
        let user = await UserModel.findByEmail(email);

        if (!user) {
          // Crear usuario nuevo desde Google (sin password_hash — solo OAuth)
          user = await UserModel.create({
            name: profile.displayName || email.split('@')[0],
            email,
            passwordHash: null,
            googleId: profile.id
          });
          logger.info(`Usuario creado via Google OAuth: ${email}`);
        } else if (!user.google_id) {
          // Vincular cuenta existente con Google si no estaba vinculada
          await UserModel.linkGoogleId(user.id, profile.id);
        }

        return done(null, user);
      } catch (err) {
        logger.error('Error en Google OAuth strategy:', err);
        return done(err);
      }
    }
  ));
}

function generateTokenFromUser(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, tier: user.tier },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { configureGoogleOAuth, generateTokenFromUser };
