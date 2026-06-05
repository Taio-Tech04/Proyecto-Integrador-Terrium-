const router = require('express').Router();
const { register, login, me } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);

module.exports = router;
