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
    logger.info('✅ Conectado a PostgreSQL (valuations)');
    retryDelayMs = INITIAL_RETRY_MS; // reset backoff tras conexión exitosa
    await runMigrations();
  } catch (err) {
    logger.warn(`Reintentando conexión a PostgreSQL (valuations)... [${err.code}] ${err.message} — en ${retryDelayMs / 1000}s`);
    setTimeout(connectDB, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS); // backoff exponencial con tope
  }
};

const runMigrations = async () => {
  // El servicio usa el esquema canónico: `valuacion` (tasaciones) + `datos_mercado`/`zona`
  // (precios de mercado), que ya existen. No creamos ni seedeamos las tablas inglesas
  // duplicadas (valuations/market_metrics).
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('valuacion','datos_mercado','zona')`
  );
  if (rows[0].n < 3) {
    logger.warn(`Esquema español incompleto: solo ${rows[0].n}/3 tablas (valuacion/datos_mercado/zona)`);
  } else {
    logger.info('✅ Esquema español verificado (valuacion/datos_mercado/zona)');
  }
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
