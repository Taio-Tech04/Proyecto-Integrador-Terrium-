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
    logger.info('✅ Conectado a PostgreSQL (valuations)');
    await runMigrations();
  } catch (err) {
    logger.warn(`Reintentando conexión a PostgreSQL (valuations)... [${err.code}] ${err.message}`);
    setTimeout(connectDB, 5000);
  }
};

const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS valuations (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(100),
      price_per_m2 DECIMAL(10,2) NOT NULL,
      estimated_price DECIMAL(14,2) NOT NULL,
      confidence DECIMAL(4,2) DEFAULT 0.80,
      neighborhood VARCHAR(100),
      method VARCHAR(50) DEFAULT 'ML_MODEL',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS market_metrics (
      id SERIAL PRIMARY KEY,
      neighborhood VARCHAR(100) NOT NULL,
      avg_price_usd_m2 DECIMAL(10,2),
      total_listings INT DEFAULT 0,
      month INT NOT NULL,
      year INT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(neighborhood, month, year)
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM market_metrics');
  if (parseInt(rows[0].count) === 0) {
    const now = new Date();
    const basePrices = [
      ['Palermo', 3200], ['Belgrano', 2900], ['Recoleta', 3500], ['Puerto Madero', 5200],
      ['Villa Crespo', 2100], ['Caballito', 1900], ['San Telmo', 2200], ['Flores', 1500],
      ['Villa Devoto', 1600], ['Microcentro', 1800], ['Almagro', 1700], ['Núñez', 2600]
    ];
    for (const [neighborhood, base] of basePrices) {
      for (let m = 11; m >= 0; m--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - m);
        const price = Math.round(base * (0.94 + Math.random() * 0.12));
        await pool.query(
          `INSERT INTO market_metrics (neighborhood, avg_price_usd_m2, total_listings, month, year)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [neighborhood, price, Math.floor(Math.random() * 60) + 10, d.getMonth() + 1, d.getFullYear()]
        );
      }
    }
    logger.info('📦 Datos iniciales de market_metrics (valuations) insertados');
  }
  logger.info('✅ Migraciones de valuations ejecutadas');
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
