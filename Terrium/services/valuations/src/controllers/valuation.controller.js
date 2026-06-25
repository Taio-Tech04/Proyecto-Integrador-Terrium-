const { query } = require('../db/connection');
const logger = require('../utils/logger');

// El servicio usa el esquema canónico: `valuacion` (tasaciones) + `datos_mercado`/`zona`
// (precios de mercado). Este controller actúa como adaptador: lee/escribe esas tablas
// pero expone el shape legacy que ya consumen el frontend y los resolvers
// (id, listing_id, price_per_m2, estimated_price, confidence, neighborhood, method),
// para no propagar el cambio de esquema fuera del servicio.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Precios de referencia en USD/m² por barrio (fuente: relevamiento manual mercado 2024).
// Se usan como fallback cuando no hay datos reales en datos_mercado.
const FALLBACK_PRICES = {
  'Palermo': 3200, 'Belgrano': 2900, 'Recoleta': 3500, 'Puerto Madero': 5200,
  'Villa Crespo': 2100, 'Caballito': 1900, 'San Telmo': 2200, 'Flores': 1500,
  'Villa Devoto': 1600, 'Microcentro': 1800, 'Almagro': 1700, 'Núñez': 2600
};

const DEFAULT_FALLBACK_PRICE = 2000;

// Fila de valuacion (con zona joineada) → shape legacy "valuation"
const toLegacy = (r) => ({
  id:              r.valuation_id,
  listing_id:      r.property_id,
  price_per_m2:    r.price_per_m2,
  estimated_price: r.estimated_price,
  confidence:      r.confidence,
  neighborhood:    r.zone_name,
  method:          r.method,
  created_at:      r.created_at
});

const SELECT_VAL = `
  SELECT v.valuation_id, v.property_id, v.price_per_m2, v.estimated_price,
         v.confidence, v.method, v.created_at, z.name AS zone_name
    FROM valuacion v
    LEFT JOIN zona z ON z.zone_id = v.zone_id`;

// Resuelve la zona por nombre (sin crearla) y devuelve su zone_id, o null si no existe
const resolveZoneId = async (name) => {
  if (!name) return null;
  const { rows } = await query('SELECT zone_id FROM zona WHERE name ILIKE $1 LIMIT 1', [name.trim()]);
  return rows[0] ? rows[0].zone_id : null;
};

/**
 * Ajuste determinista por superficie: propiedades más grandes tienen
 * un precio/m² ligeramente menor (economía de escala).
 * Retorna un factor entre 0.92 y 1.08.
 */
function surfaceAdjustmentFactor(surfaceM2) {
  if (surfaceM2 <= 30)  return 1.08;
  if (surfaceM2 <= 60)  return 1.04;
  if (surfaceM2 <= 100) return 1.00;
  if (surfaceM2 <= 200) return 0.97;
  return 0.92;
}

const getByProperty = async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: 'id de propiedad inválido (UUID)' });
    }
    const { rows } = await query(
      `${SELECT_VAL} WHERE v.property_id = $1 ORDER BY v.created_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Valuación no encontrada' });
    res.json(toLegacy(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener valuación' });
  }
};

const getPriceHistory = async (req, res) => {
  try {
    const { neighborhood } = req.params;
    const months = parseInt(req.query.months) || 12;
    const { rows } = await query(
      `SELECT z.name AS neighborhood,
              dm.avg_price_m2 AS avg_price_usd_m2,
              dm.total_listings,
              EXTRACT(MONTH FROM dm.period_month)::int AS month,
              EXTRACT(YEAR  FROM dm.period_month)::int AS year
         FROM datos_mercado dm
         JOIN zona z ON z.zone_id = dm.zone_id
        WHERE z.name ILIKE $1
        ORDER BY dm.period_month DESC
        LIMIT $2`,
      [`%${neighborhood}%`, months]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const estimate = async (req, res) => {
  try {
    const { listingId, neighborhood, surfaceM2 } = req.body;
    if (!neighborhood || !surfaceM2) {
      return res.status(400).json({ error: 'neighborhood y surfaceM2 son requeridos' });
    }

    // Intentar obtener precio promedio real del mercado para el barrio (último período disponible)
    let basePrice = null;
    let usingRealData = false;
    let zoneId = null;
    try {
      const { rows: metrics } = await query(
        `SELECT dm.zone_id, dm.avg_price_m2
           FROM datos_mercado dm
           JOIN zona z ON z.zone_id = dm.zone_id
          WHERE z.name ILIKE $1
          ORDER BY dm.period_month DESC
          LIMIT 1`,
        [`%${neighborhood}%`]
      );
      if (metrics.length && metrics[0].avg_price_m2) {
        basePrice = parseFloat(metrics[0].avg_price_m2);
        zoneId = metrics[0].zone_id;
        usingRealData = true;
      }
    } catch (metricsErr) {
      logger.warn('No se pudieron obtener métricas de mercado, usando precios de referencia:', metricsErr.message);
    }

    if (!basePrice) {
      basePrice = FALLBACK_PRICES[neighborhood] || DEFAULT_FALLBACK_PRICE;
    }
    // Si no hubo datos de mercado, intentar igualmente resolver la zona para persistir el FK
    if (!zoneId) zoneId = await resolveZoneId(neighborhood);

    const pricePerM2 = Math.round(basePrice * surfaceAdjustmentFactor(surfaceM2));
    const estimatedPrice = Math.round(pricePerM2 * surfaceM2);

    // Confianza determinista: mayor si hay datos reales y la superficie es razonable
    const hasReasonableSurface = surfaceM2 >= 20 && surfaceM2 <= 500;
    const confidence = usingRealData
      ? (hasReasonableSurface ? 0.82 : 0.65)
      : (hasReasonableSurface ? 0.60 : 0.45);

    // Persistir solo si se provee una propiedad válida (UUID canónico)
    if (listingId && UUID_RE.test(listingId)) {
      const { rows } = await query(
        `INSERT INTO valuacion (property_id, zone_id, price_per_m2, estimated_price, confidence, method)
         VALUES ($1, $2, $3, $4, $5, 'RULE_BASED') RETURNING valuation_id`,
        [listingId, zoneId, pricePerM2, estimatedPrice, confidence]
      );
      const { rows: full } = await query(
        `${SELECT_VAL} WHERE v.valuation_id = $1`, [rows[0].valuation_id]
      );
      return res.status(201).json(toLegacy(full[0]));
    }

    res.json({ pricePerM2, estimatedPrice, confidence, neighborhood, method: 'RULE_BASED' });
  } catch (err) {
    logger.error('Error en estimate:', err);
    res.status(500).json({ error: 'Error al calcular valuación' });
  }
};

module.exports = { getByProperty, getPriceHistory, estimate, surfaceAdjustmentFactor };
