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
  } catch (err) {
    logger.warn('Reintentando conexión a PostgreSQL (valuations)...');
    setTimeout(connectDB, 5000);
  }
};
module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

