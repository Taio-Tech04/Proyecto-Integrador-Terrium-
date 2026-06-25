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
    logger.info('✅ Conectado a PostgreSQL (notifications)');
    retryDelayMs = INITIAL_RETRY_MS; // reset backoff tras conexión exitosa
    // El servicio usa el esquema canónico `notificacion` (FK a `usuario`), que ya
    // existe. No creamos la tabla inglesa duplicada (notifications).
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('notificacion','usuario')`
    );
    if (rows[0].n < 2) {
      logger.warn(`Esquema español incompleto: solo ${rows[0].n}/2 tablas (notificacion/usuario)`);
    } else {
      logger.info('✅ Esquema español verificado (notificacion/usuario)');
    }
  } catch (err) {
    logger.warn(`Reintentando conexión (notifications) en ${retryDelayMs / 1000}s...`);
    setTimeout(connectDB, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS); // backoff exponencial con tope
  }
};
module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
