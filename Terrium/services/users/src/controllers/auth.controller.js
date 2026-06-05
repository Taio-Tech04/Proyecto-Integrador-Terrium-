const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const UserModel = require('../models/user.model');
const { publish } = require('../events/publisher');
const logger = require('../utils/logger');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password } = value;
    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, passwordHash });

    const token = jwt.sign(
      { userId: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await publish('users', 'user.registered', { userId: user.id, name: user.name, email: user.email });

    res.status(201).json({ token, user });
  } catch (err) {
    logger.error('Error en register:', err);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;
    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (!user.is_active) return res.status(403).json({ error: 'Cuenta desactivada' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, tier: user.tier } });
  } catch (err) {
    logger.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

const me = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    logger.error('Error en me:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

module.exports = { register, login, me };
