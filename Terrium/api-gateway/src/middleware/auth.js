const jwt = require('jsonwebtoken');
const config = require('../config');

/** @type {import('express').RequestHandler} */
module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-tier']  = decoded.tier;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};


