const { query } = require('../db/connection');
const UserModel = require('../models/user.model');
const { publish } = require('../events/publisher');
const logger = require('../utils/logger');

const PLANS = [
  { tier: 'FREE', priceArs: 0, features: ['Búsqueda básica de propiedades', 'Datos generales del mercado', 'Calculadora ROI básica'] },
  { tier: 'BASIC', priceArs: 4999, features: ['Todo lo de FREE', 'Historial de precios por barrio', 'Valuaciones automáticas', 'Alertas de precio', 'Datos de inversión avanzados'] },
  { tier: 'PRO', priceArs: 14999, features: ['Todo lo de BASIC', 'Mapa de calor de CABA', 'Analytics avanzados', 'Ranking de barrios', 'Score de inversión', 'Acceso a API REST'] },
  { tier: 'ENTERPRISE', priceArs: 0, features: ['Todo lo de PRO', 'Soporte prioritario 24/7', 'White-label', 'Volumen de requests ilimitado', 'Reportes personalizados', 'Account manager dedicado'] }
];

const getPlans = async (req, res) => {
  res.json(PLANS);
};

const getMySubscription = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { rows } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    res.json(rows[0] || { tier: 'FREE', status: 'ACTIVE' });
  } catch (err) {
    logger.error('Error en getMySubscription:', err);
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
};

const upgrade = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { tier } = req.body;
    const validTiers = ['BASIC', 'PRO', 'ENTERPRISE'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Plan inválido. Opciones: BASIC, PRO, ENTERPRISE' });
    }

    const plan = PLANS.find((p) => p.tier === tier);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await query(`UPDATE subscriptions SET status = 'CANCELLED' WHERE user_id = $1 AND status = 'ACTIVE'`, [userId]);

    await query(
      `INSERT INTO subscriptions (user_id, plan, price_ars, expires_at) VALUES ($1, $2, $3, $4)`,
      [userId, tier, plan.priceArs, expiresAt]
    );

    // Capturar el tier anterior ANTES de actualizar
    const currentUser = await UserModel.findById(userId);
    const previousTier = currentUser?.tier;

    const user = await UserModel.updateTier(userId, tier);
    await publish('users', 'subscription.upgraded', { userId, tier, previousTier, email: req.headers['x-user-email'] });

    res.json({ message: `Suscripción actualizada a ${tier}`, user });
  } catch (err) {
    logger.error('Error en upgrade:', err);
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
};

module.exports = { getPlans, getMySubscription, upgrade };

