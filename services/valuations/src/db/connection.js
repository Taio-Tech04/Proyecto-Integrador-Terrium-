const { Pool } = require('pg');
const logger = require('../utils/logger');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (valuations)');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS valuations (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(100) NOT NULL,
        price_usd_m2 DECIMAL(10,2),
        estimated_value DECIMAL(14,2),
        confidence_score DECIMAL(4,2),
        method VARCHAR(50) DEFAULT 'comparable_sales',
        neighborhood VARCHAR(100),
        calculated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        neighborhood VARCHAR(100) NOT NULL,
        avg_price_usd_m2 DECIMAL(10,2),
        sample_size INT,
        month INT,
        year INT,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    logger.warn('Reintentando conexión a PostgreSQL (valuations)...');
    setTimeout(connectDB, 5000);
  }
};
module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

