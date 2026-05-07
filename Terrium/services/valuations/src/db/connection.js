const { Pool } = require('pg');
const logger = require('../utils/logger');

const isSupabase = (process.env.DATABASE_URL || '').includes('supabase.co');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (valuations)');
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS valuations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id UUID,
        user_id UUID,
        neighborhood VARCHAR(100) NOT NULL,
        surface_m2 NUMERIC(8,2),
        rooms INTEGER DEFAULT 0,
        type VARCHAR(20),
        estimated_price NUMERIC(12,2),
        price_per_m2 NUMERIC(8,2),
        confidence NUMERIC(5,2),
        method VARCHAR(50) DEFAULT 'ML_MODEL',
        input_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS market_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        neighborhood VARCHAR(100) NOT NULL,
        month INTEGER,
        year INTEGER,
        avg_price_usd_m2 NUMERIC(10,2),
        avg_price_ars_m2 NUMERIC(14,2),
        total_listings INTEGER DEFAULT 0,
        sold_listings INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (neighborhood, month, year)
      );
    `);
    logger.info('✅ Migraciones de valuations ejecutadas');
  } catch (err) {
    logger.warn('Reintentando conexión a PostgreSQL (valuations)...');
    setTimeout(connectDB, 5000);
  }
};
module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

