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
    logger.info('✅ Conectado a PostgreSQL (listings)');
    retryDelayMs = INITIAL_RETRY_MS; // reset backoff tras conexión exitosa
    await runMigrations();
  } catch (err) {
    logger.error(`Error conectando a PostgreSQL (listings): [${err.code}] ${err.message} — reintento en ${retryDelayMs / 1000}s`);
    setTimeout(connectDB, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS); // backoff exponencial con tope
  }
};

const runMigrations = async () => {
  // El servicio usa el esquema canónico `propiedad` (+ `zona`), que ya existe.
  // No creamos ni seedeamos la tabla `listings` (inglesa, duplicada).
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('propiedad','zona')`
  );
  if (rows[0].n < 2) {
    logger.warn(`Esquema español incompleto: solo ${rows[0].n}/2 tablas (propiedad/zona)`);
  } else {
    logger.info('✅ Esquema español verificado (propiedad/zona)');
  }
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
