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

const INITIAL_RETRY_MS = 5000;
const MAX_RETRY_MS = 60000;
let retryDelayMs = INITIAL_RETRY_MS;

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (analytics)');
    retryDelayMs = INITIAL_RETRY_MS; // reset backoff tras conexión exitosa
    await runMigrations();
  } catch (err) {
    logger.warn(`Reintentando conexión PostgreSQL (analytics) en ${retryDelayMs / 1000}s...`);
    setTimeout(connectDB, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS); // backoff exponencial con tope
  }
};

const runMigrations = async () => {
  // El servicio usa el esquema canónico: `datos_mercado` (+ `zona`) para precios de
  // mercado y `score_inversion` (+ `zona`) para scores. Ya existen. No creamos ni
  // seedeamos las tablas inglesas duplicadas (market_metrics/investment_scores).
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('datos_mercado','score_inversion','zona')`
  );
  if (rows[0].n < 3) {
    logger.warn(`Esquema español incompleto: solo ${rows[0].n}/3 tablas (datos_mercado/score_inversion/zona)`);
  } else {
    logger.info('✅ Esquema español verificado (datos_mercado/score_inversion/zona)');
  }
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
