const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { CABA_COORDS, NEIGHBORHOOD_MAP } = require('../utils/constants');

// El servicio usa el esquema canónico: `datos_mercado` (+ `zona`) para precios de
// mercado y `score_inversion` (+ `zona`) para scores. Estas queries leen las tablas
// español pero exponen el shape legacy que ya consumen el frontend y los resolvers
// (neighborhood, avg_price_usd_m2, score, yield_pct, trend, ...), para no propagar el
// cambio de esquema fuera del servicio.

const getMarketTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const { rows } = await query(
      `SELECT z.name AS neighborhood,
              dm.avg_price_m2 AS avg_price_usd_m2,
              dm.total_listings,
              EXTRACT(MONTH FROM dm.period_month)::int AS month,
              EXTRACT(YEAR  FROM dm.period_month)::int AS year
         FROM datos_mercado dm
         JOIN zona z ON z.zone_id = dm.zone_id
        WHERE dm.period_month >= (date_trunc('month', NOW()) - make_interval(months => $1))
        ORDER BY z.name, dm.period_month ASC`,
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
      `SELECT DISTINCT ON (z.name) z.name AS neighborhood, dm.avg_price_m2 AS avg_price_usd_m2
         FROM datos_mercado dm
         JOIN zona z ON z.zone_id = dm.zone_id
        ORDER BY z.name, dm.period_month DESC`
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

// Score de inversión (con zona joineada) → shape legacy
const SELECT_SCORE = `
  SELECT z.name AS neighborhood, s.score, s.yield_pct, s.trend, s.details, s.updated_at
    FROM score_inversion s
    JOIN zona z ON z.zone_id = s.zone_id`;

const getInvestmentScore = async (req, res) => {
  try {
    const { rows } = await query(`${SELECT_SCORE} WHERE z.name ILIKE $1`, [`%${req.params.neighborhood}%`]);
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
      `${SELECT_SCORE} ORDER BY s.score DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await query('SELECT COUNT(*) FROM score_inversion');

    res.json({ data: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
};

const getMarketOverview = async (req, res) => {
  try {
    // Usamos el ÚLTIMO período disponible (no el mes calendario actual): la data de
    // mercado suele venir con rezago, así no mostramos ceros cuando falta el mes en curso.
    const latestPeriod = 'dm.period_month = (SELECT MAX(period_month) FROM datos_mercado)';
    const { rows: metrics } = await query(`
      SELECT
        AVG(dm.avg_price_m2)::int AS avg_price_usd_m2,
        SUM(dm.total_listings) AS total_listings,
        COUNT(DISTINCT dm.zone_id) AS neighborhoods_count
      FROM datos_mercado dm
      WHERE ${latestPeriod}
    `);
    const { rows: topNeighborhoods } = await query(
      `SELECT z.name AS neighborhood, s.score, s.yield_pct, s.trend
         FROM score_inversion s JOIN zona z ON z.zone_id = s.zone_id
        ORDER BY s.score DESC LIMIT 5`
    );

    // Origen de los datos del último período. Si hay varios, mostramos el menos
    // confiable (prioridad fallback > reference > scraper > caba_api) para no
    // dar una impresión de mayor fiabilidad de la real.
    const { rows: sourceRows } = await query(`
      SELECT DISTINCT dm.data_source FROM datos_mercado dm WHERE ${latestPeriod}
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
