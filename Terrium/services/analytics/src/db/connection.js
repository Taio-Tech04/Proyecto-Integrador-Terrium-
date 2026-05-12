const { Pool } = require('pg');
const logger = require('../utils/logger');

const isSupabase = (process.env.DATABASE_URL || '').includes('supabase');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (analytics)');
    await runMigrations();
  } catch (err) {
    logger.warn('Reintentando conexión PostgreSQL (analytics)...');
    setTimeout(connectDB, 5000);
  }
};

const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_metrics (
      id SERIAL PRIMARY KEY,
      neighborhood VARCHAR(100) NOT NULL,
      avg_price_usd_m2 DECIMAL(10,2),
      avg_price_ars_m2 DECIMAL(12,2),
      total_listings INT DEFAULT 0,
      median_days_listed DECIMAL(8,2) DEFAULT 0,
      month INT NOT NULL,
      year INT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(neighborhood, month, year)
    );

    CREATE TABLE IF NOT EXISTS investment_scores (
      id SERIAL PRIMARY KEY,
      neighborhood VARCHAR(100) UNIQUE NOT NULL,
      score DECIMAL(4,2) DEFAULT 0,
      yield_pct DECIMAL(5,2) DEFAULT 0,
      trend VARCHAR(20) DEFAULT 'ESTABLE',
      recommendation TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM market_metrics');
  if (parseInt(rows[0].count) === 0) {
    const now = new Date();
    const neighborhoods = [
      { n: 'Palermo', price: 3200, score: 8.5, yield: 5.2, trend: 'ALZA' },
      { n: 'Belgrano', price: 2900, score: 8.1, yield: 4.8, trend: 'ALZA' },
      { n: 'Recoleta', price: 3500, score: 7.9, yield: 4.2, trend: 'ESTABLE' },
      { n: 'Puerto Madero', price: 5200, score: 7.2, yield: 3.1, trend: 'ESTABLE' },
      { n: 'Villa Crespo', price: 2100, score: 8.8, yield: 6.1, trend: 'ALZA' },
      { n: 'Caballito', price: 1900, score: 8.3, yield: 5.8, trend: 'ALZA' },
      { n: 'San Telmo', price: 2200, score: 7.6, yield: 5.5, trend: 'ALZA' },
      { n: 'Flores', price: 1500, score: 7.1, yield: 6.8, trend: 'ESTABLE' },
      { n: 'Villa Devoto', price: 1600, score: 7.4, yield: 6.2, trend: 'ESTABLE' },
      { n: 'Microcentro', price: 1800, score: 6.5, yield: 4.9, trend: 'BAJA' },
      { n: 'Almagro', price: 1700, score: 7.8, yield: 6.0, trend: 'ALZA' },
      { n: 'Núñez', price: 2600, score: 7.9, yield: 5.0, trend: 'ALZA' }
    ];

    for (const b of neighborhoods) {
      for (let m = 5; m >= 0; m--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - m);
        const variation = 1 + (Math.random() * 0.06 - 0.02);
        const priceM = Math.round(b.price * Math.pow(variation, m));
        await pool.query(
          `INSERT INTO market_metrics (neighborhood, avg_price_usd_m2, total_listings, month, year)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [b.n, priceM, Math.floor(Math.random() * 80) + 20, d.getMonth() + 1, d.getFullYear()]
        );
      }
      await pool.query(
        `INSERT INTO investment_scores (neighborhood, score, yield_pct, trend, recommendation)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (neighborhood) DO UPDATE SET score=$2, yield_pct=$3, trend=$4, recommendation=$5`,
        [b.n, b.score, b.yield, b.trend, getRecommendation(b.score, b.trend)]
      );
    }
      logger.info('Datos de analytics inicializados');
    }
};

const getRecommendation = (score, trend) => {
  if (score >= 8.5 && trend === 'ALZA') return 'Excelente oportunidad de inversión. Alta demanda y potencial de valorización.';
  if (score >= 7.5) return 'Buena zona para invertir. Mercado activo con perspectivas positivas.';
  if (score >= 6.5) return 'Zona en desarrollo. Considerar para inversión a mediano plazo.';
  return 'Mercado maduro. Mayor seguridad pero menor potencial de valorización.';
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

