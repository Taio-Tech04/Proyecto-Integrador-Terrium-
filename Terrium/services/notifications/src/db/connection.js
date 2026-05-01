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
    logger.info('✅ Conectado a PostgreSQL (notifications)');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(200),
        body TEXT,
        status VARCHAR(20) DEFAULT 'PENDIENTE',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    logger.warn('Reintentando conexión (notifications)...');
    setTimeout(connectDB, 5000);
  }
};
module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

