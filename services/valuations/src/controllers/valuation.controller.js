const axios = require('axios');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

// Precios promedio por barrio en USD/m² (datos de referencia CABA 2024)
const BASE_PRICES = {
  'Palermo': 3200, 'Belgrano': 2900, 'Recoleta': 3500, 'Puerto Madero': 5200,
  'Villa Crespo': 2100, 'Caballito': 1900, 'San Telmo': 2200, 'Flores': 1500,
  'Villa Devoto': 1600, 'Microcentro': 1800, 'Almagro': 1700, 'Núñez': 2600
};

const getByProperty = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM valuations WHERE property_id = $1 ORDER BY calculated_at DESC LIMIT 1',
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
      `SELECT * FROM price_history WHERE neighborhood ILIKE $1
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
    const { propertyId, neighborhood, surfaceM2 } = req.body;
    if (!neighborhood || !surfaceM2) {
      return res.status(400).json({ error: 'neighborhood y surfaceM2 son requeridos' });
    }

    const basePrice = BASE_PRICES[neighborhood] || 2000;
    // Variación aleatoria para simular comparables reales
    const variation = 0.95 + Math.random() * 0.1;
    const priceUsdM2 = Math.round(basePrice * variation);
    const estimatedValue = Math.round(priceUsdM2 * surfaceM2);
    const confidenceScore = 0.75 + Math.random() * 0.20;

    let id = propertyId;
    if (id) {
      const { rows } = await query(
        `INSERT INTO valuations (property_id, price_usd_m2, estimated_value, confidence_score, neighborhood)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, priceUsdM2, estimatedValue, confidenceScore.toFixed(2), neighborhood]
      );
      return res.status(201).json(rows[0]);
    }

    res.json({ priceUsdM2, estimatedValue, confidenceScore: parseFloat(confidenceScore.toFixed(2)), neighborhood });
  } catch (err) {
    logger.error('Error en estimate:', err);
    res.status(500).json({ error: 'Error al calcular valuación' });
  }
};

module.exports = { getByProperty, getPriceHistory, estimate };

