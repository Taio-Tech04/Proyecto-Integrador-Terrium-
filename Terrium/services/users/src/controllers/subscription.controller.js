const { query } = require('../db/connection');
const UserModel = require('../models/user.model');
const { publish } = require('../events/publisher');
const logger = require('../utils/logger');

// Planes mostrados en la página de precios. Se mantienen los 4 tiers de la app;
// el upgrade los traduce al plan real del esquema español (free/investor/seller).
const PLANS = [
  { tier: 'FREE', priceArs: 0, features: ['Búsqueda básica de propiedades', 'Datos generales del mercado', 'Calculadora ROI básica'] },
  { tier: 'BASIC', priceArs: 4999, features: ['Todo lo de FREE', 'Historial de precios por barrio', 'Valuaciones automáticas', 'Alertas de precio', 'Datos de inversión avanzados'] },
  { tier: 'PRO', priceArs: 14999, features: ['Todo lo de BASIC', 'Mapa de calor de CABA', 'Analytics avanzados', 'Ranking de barrios', 'Score de inversión', 'Acceso a API REST'] },
  { tier: 'ENTERPRISE', priceArs: 0, features: ['Todo lo de PRO', 'Soporte prioritario 24/7', 'White-label', 'Volumen de requests ilimitado', 'Reportes personalizados', 'Account manager dedicado'] }
];

// Tier de la app → plan_type del esquema español al hacer upgrade.
const TIER_TO_PLAN_TYPE = { BASIC: 'investor', PRO: 'investor', ENTERPRISE: 'seller' };

const getPlans = async (req, res) => {
  res.json(PLANS);
};

const getMySubscription = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { rows } = await query(
      `SELECT s.subscription_id, s.status, s.start_date, s.end_date, s.auto_renew,
              ps.name AS plan_name, ps.plan_type, ps.price_monthly
         FROM suscripcion s
         JOIN plan_suscripcion ps ON ps.plan_id = s.plan_id
        WHERE s.user_id = $1 AND LOWER(s.status) = 'active'
        ORDER BY s.start_date DESC NULLS LAST LIMIT 1`,
      [userId]
    );
    if (!rows[0]) return res.json({ tier: 'FREE', status: 'active', plan_type: 'free' });
    const sub = rows[0];
    sub.tier = UserModel.deriveTier(null, sub.plan_type);
    res.json(sub);
  } catch (err) {
    logger.error('Error en getMySubscription:', err);
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
};

const upgrade = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { tier } = req.body;
    const planType = TIER_TO_PLAN_TYPE[tier];
    if (!planType) {
      return res.status(400).json({ error: 'Plan inválido. Opciones: BASIC, PRO, ENTERPRISE' });
    }

    // Resolver el plan real (esquema español) a partir del plan_type
    const { rows: planRows } = await query(
      `SELECT plan_id FROM plan_suscripcion WHERE plan_type = $1 AND is_active = true LIMIT 1`,
      [planType]
    );
    if (!planRows[0]) {
      return res.status(400).json({ error: `No existe un plan disponible para ${tier}` });
    }
    const planId = planRows[0].plan_id;

    // Cancelar la suscripción activa anterior y crear la nueva (1 mes)
    await query(`UPDATE suscripcion SET status = 'cancelled' WHERE user_id = $1 AND LOWER(status) = 'active'`, [userId]);
    await query(
      `INSERT INTO suscripcion (user_id, plan_id, start_date, end_date, status, auto_renew)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'active', false)`,
      [userId, planId]
    );

    const user = await UserModel.findById(userId); // tier ya derivado del nuevo plan
    await publish('users', 'subscription.upgraded', { userId, tier: user?.tier, email: req.headers['x-user-email'] });

    res.json({ message: `Suscripción actualizada a ${tier}`, user });
  } catch (err) {
    logger.error('Error en upgrade:', err);
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
};

module.exports = { getPlans, getMySubscription, upgrade };
