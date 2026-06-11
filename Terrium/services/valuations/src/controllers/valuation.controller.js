const { query } = require('../db/connection');
const logger = require('../utils/logger');

// Precios de referencia en USD/m² por barrio (fuente: relevamiento manual mercado 2024).
// Se usan como fallback cuando no hay datos reales en market_metrics.
const FALLBACK_PRICES = {
  'Palermo': 3200, 'Belgrano': 2900, 'Recoleta': 3500, 'Puerto Madero': 5200,
  'Villa Crespo': 2100, 'Caballito': 1900, 'San Telmo': 2200, 'Flores': 1500,
  'Villa Devoto': 1600, 'Microcentro': 1800, 'Almagro': 1700, 'Núñez': 2600
};

const DEFAULT_FALLBACK_PRICE = 2000;

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
    const { rows } = await query(
      'SELECT * FROM valuations WHERE listing_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Valuación no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener valuación' });
  }
};

const getPriceHistory = async (req, res) => {
  try {
    const { neighborhood } = req.params;
    const months = parseInt(req.query.months) || 12;
    const { rows } = await query(
      `SELECT neighborhood, avg_price_usd_m2, total_listings, month, year
       FROM market_metrics WHERE neighborhood ILIKE $1
       ORDER BY year DESC, month DESC LIMIT $2`,
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

    // Intentar obtener precio promedio real del mercado para el barrio (último mes disponible)
    let basePrice = null;
    let usingRealData = false;
    try {
      const { rows: metrics } = await query(
        `SELECT avg_price_usd_m2 FROM market_metrics
         WHERE neighborhood ILIKE $1
         ORDER BY year DESC, month DESC LIMIT 1`,
        [`%${neighborhood}%`]
      );
      if (metrics.length && metrics[0].avg_price_usd_m2) {
        basePrice = parseFloat(metrics[0].avg_price_usd_m2);
        usingRealData = true;
      }
    } catch (metricsErr) {
      logger.warn('No se pudieron obtener métricas de mercado, usando precios de referencia:', metricsErr.message);
    }

    if (!basePrice) {
      basePrice = FALLBACK_PRICES[neighborhood] || DEFAULT_FALLBACK_PRICE;
    }

    const pricePerM2 = Math.round(basePrice * surfaceAdjustmentFactor(surfaceM2));
    const estimatedPrice = Math.round(pricePerM2 * surfaceM2);

    // Confianza determinista: mayor si hay datos reales y la superficie es razonable
    const hasReasonableSurface = surfaceM2 >= 20 && surfaceM2 <= 500;
    const confidence = usingRealData
      ? (hasReasonableSurface ? 0.82 : 0.65)
      : (hasReasonableSurface ? 0.60 : 0.45);

    if (listingId) {
      const { rows } = await query(
        `INSERT INTO valuations (listing_id, price_per_m2, estimated_price, confidence, neighborhood, method)
         VALUES ($1, $2, $3, $4, $5, 'RULE_BASED') RETURNING *`,
        [listingId, pricePerM2, estimatedPrice, confidence, neighborhood]
      );
      return res.status(201).json(rows[0]);
    }

    res.json({ pricePerM2, estimatedPrice, confidence, neighborhood, method: 'RULE_BASED' });
  } catch (err) {
    logger.error('Error en estimate:', err);
    res.status(500).json({ error: 'Error al calcular valuación' });
  }
};

module.exports = { getByProperty, getPriceHistory, estimate };
