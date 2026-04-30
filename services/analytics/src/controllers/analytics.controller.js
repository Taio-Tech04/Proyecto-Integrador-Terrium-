const { query } = require('../db/connection');
const logger = require('../utils/logger');

// Coordenadas reales de CABA por barrio
const CABA_COORDS = {
  'Palermo': { lat: -34.5889, lng: -58.4277 },
  'Belgrano': { lat: -34.5601, lng: -58.4568 },
  'Recoleta': { lat: -34.5875, lng: -58.3944 },
  'Puerto Madero': { lat: -34.6118, lng: -58.3622 },
  'Villa Crespo': { lat: -34.5999, lng: -58.4433 },
  'Caballito': { lat: -34.6189, lng: -58.4402 },
  'San Telmo': { lat: -34.6212, lng: -58.3731 },
  'Flores': { lat: -34.6312, lng: -58.4648 },
  'Villa Devoto': { lat: -34.6148, lng: -58.5234 },
  'Microcentro': { lat: -34.6083, lng: -58.3712 },
  'Almagro': { lat: -34.6064, lng: -58.4204 },
  'Núñez': { lat: -34.5449, lng: -58.4612 }
};

const getMarketTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const { rows } = await query(
      `SELECT neighborhood, avg_price_usd_m2, total_listings, month, year
       FROM market_metrics
       WHERE (year * 12 + month) >= (EXTRACT(YEAR FROM NOW())::int * 12 + EXTRACT(MONTH FROM NOW())::int - $1)
       ORDER BY neighborhood, year ASC, month ASC`,
      [months]
    );
    res.json(rows);
  } catch (err) {
    logger.error('Error en getMarketTrends:', err);
    res.status(500).json({ error: 'Error al obtener tendencias' });
  }
};

const getHeatmap = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (neighborhood) neighborhood, avg_price_usd_m2
       FROM market_metrics ORDER BY neighborhood, year DESC, month DESC`
    );

    const heatmapPoints = rows.map((r) => {
      const coords = CABA_COORDS[r.neighborhood] || { lat: -34.6, lng: -58.45 };
      const maxPrice = 5500;
      const intensity = Math.min(parseFloat(r.avg_price_usd_m2) / maxPrice, 1);
      return {
        lat: coords.lat + (Math.random() * 0.008 - 0.004),
        lng: coords.lng + (Math.random() * 0.008 - 0.004),
        intensity,
        neighborhood: r.neighborhood,
        avgPriceUsdM2: parseFloat(r.avg_price_usd_m2)
      };
    });

    // Expandir puntos para mejor visualización
    const expanded = [];
    heatmapPoints.forEach((p) => {
      expanded.push(p);
      for (let i = 0; i < 5; i++) {
        expanded.push({
          ...p,
          lat: p.lat + (Math.random() * 0.012 - 0.006),
          lng: p.lng + (Math.random() * 0.012 - 0.006),
          intensity: p.intensity * (0.7 + Math.random() * 0.3)
        });
      }
    });

    res.json(expanded);
  } catch (err) {
    logger.error('Error en getHeatmap:', err);
    res.status(500).json({ error: 'Error al obtener heatmap' });
  }
};

const getInvestmentScore = async (req, res) => {
  try {
    const { neighborhood } = req.params;
    const { rows } = await query('SELECT * FROM investment_scores WHERE neighborhood ILIKE $1', [`%${neighborhood}%`]);
    if (!rows.length) return res.status(404).json({ error: 'Barrio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener score' });
  }
};

const getNeighborhoodRanking = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM investment_scores ORDER BY score DESC LIMIT 20');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
};

const getMarketOverview = async (req, res) => {
  try {
    const { rows: metrics } = await query(`
      SELECT
        AVG(avg_price_usd_m2)::int AS avg_price_usd_m2,
        SUM(total_listings) AS total_listings,
        COUNT(DISTINCT neighborhood) AS neighborhoods_count
      FROM market_metrics
      WHERE year = EXTRACT(YEAR FROM NOW()) AND month = EXTRACT(MONTH FROM NOW())
    `);
    const { rows: topNeighborhoods } = await query(
      'SELECT neighborhood, score, yield_pct, trend FROM investment_scores ORDER BY score DESC LIMIT 5'
    );
    res.json({
      avgPriceUsdM2: metrics[0]?.avg_price_usd_m2 || 0,
      totalListings: metrics[0]?.total_listings || 0,
      neighborhoodsCount: metrics[0]?.neighborhoods_count || 0,
      topNeighborhoods
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener overview' });
  }
};

module.exports = { getMarketTrends, getHeatmap, getInvestmentScore, getNeighborhoodRanking, getMarketOverview };

