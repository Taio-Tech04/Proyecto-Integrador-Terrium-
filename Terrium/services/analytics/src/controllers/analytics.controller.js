const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { CABA_COORDS, NEIGHBORHOOD_MAP } = require('../utils/constants');

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
    logger.error('getMarketTrends:', err);
    res.status(500).json({ error: 'Error al obtener tendencias' });
  }
};

const getHeatmap = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (neighborhood) neighborhood, avg_price_usd_m2
       FROM market_metrics ORDER BY neighborhood, year DESC, month DESC`
    );
    const expanded = [];
    rows.forEach((r) => {
      const canonical = NEIGHBORHOOD_MAP[r.neighborhood.toLowerCase()] || r.neighborhood;
      const coords = CABA_COORDS[canonical] || { lat: -34.6, lng: -58.45 };
      const intensity = Math.min(parseFloat(r.avg_price_usd_m2) / 5500, 1);
      const base = { lat: coords.lat + (Math.random() * 0.008 - 0.004), lng: coords.lng + (Math.random() * 0.008 - 0.004), intensity, neighborhood: r.neighborhood, avgPriceUsdM2: parseFloat(r.avg_price_usd_m2) };
      expanded.push(base);
      for (let i = 0; i < 5; i++) {
        expanded.push({ ...base, lat: base.lat + (Math.random() * 0.012 - 0.006), lng: base.lng + (Math.random() * 0.012 - 0.006), intensity: base.intensity * (0.7 + Math.random() * 0.3) });
      }
    });
    res.json(expanded);
  } catch (err) {
    logger.error('getHeatmap:', err);
    res.status(500).json({ error: 'Error al obtener heatmap' });
  }
};

const getInvestmentScore = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM investment_scores WHERE neighborhood ILIKE $1', [`%${req.params.neighborhood}%`]);
    if (!rows.length) return res.status(404).json({ error: 'Barrio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener score' });
  }
};

const getNeighborhoodRanking = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const { rows } = await query(
      'SELECT * FROM investment_scores ORDER BY score DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const { rows: countRows } = await query('SELECT COUNT(*) FROM investment_scores');

    res.json({ data: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
};

const getMarketOverview = async (req, res) => {
  try {
    // Usamos el ÚLTIMO mes disponible (no el mes calendario actual): la data de
    // mercado suele venir con rezago, así no mostramos ceros cuando falta el mes en curso.
    const latestPeriod = '(year * 12 + month) = (SELECT MAX(year * 12 + month) FROM market_metrics)';
    const { rows: metrics } = await query(`
      SELECT
        AVG(avg_price_usd_m2)::int AS avg_price_usd_m2,
        SUM(total_listings) AS total_listings,
        COUNT(DISTINCT neighborhood) AS neighborhoods_count
      FROM market_metrics
      WHERE ${latestPeriod}
    `);
    const { rows: topNeighborhoods } = await query(
      'SELECT neighborhood, score, yield_pct, trend FROM investment_scores ORDER BY score DESC LIMIT 5'
    );

    // Origen de los datos del último mes. Si hay varios, mostramos el menos
    // confiable (prioridad fallback > reference > scraper > caba_api) para no
    // dar una impresión de mayor fiabilidad de la real.
    const { rows: sourceRows } = await query(`
      SELECT DISTINCT data_source FROM market_metrics WHERE ${latestPeriod}
    `);
    const present = sourceRows.map((r) => r.data_source);
    const priority = ['fallback', 'reference', 'scraper', 'caba_api'];
    const dataSource = priority.find((p) => present.includes(p)) || present[0] || 'unknown';

    res.json({
      avgPriceUsdM2: metrics[0]?.avg_price_usd_m2 || 0,
      totalListings: metrics[0]?.total_listings || 0,
      neighborhoodsCount: metrics[0]?.neighborhoods_count || 0,
      dataSource,
      topNeighborhoods
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener overview' });
  }
};

module.exports = { getMarketTrends, getHeatmap, getInvestmentScore, getNeighborhoodRanking, getMarketOverview };
