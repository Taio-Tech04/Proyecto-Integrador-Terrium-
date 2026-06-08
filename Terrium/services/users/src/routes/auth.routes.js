const router = require('express').Router();
const passport = require('passport');
const { register, login, me } = require('../controllers/auth.controller');
const { generateTokenFromUser } = require('../config/googleOAuth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);

// GET /auth/google — Inicia el flujo OAuth con Google
// Requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el entorno
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /auth/google/callback — Google redirige aquí tras autenticar al usuario
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const token = generateTokenFromUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    // Redirige al frontend con el token en la URL (el JS del frontend lo almacena en localStorage)
    res.redirect(`${frontendUrl}/login.html?token=${token}`);
  }
);

module.exports = router;
