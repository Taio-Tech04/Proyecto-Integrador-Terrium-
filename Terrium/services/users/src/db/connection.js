const { Pool } = require('pg');
const logger = require('../utils/logger');

// Supabase requiere SSL; detectamos si la URL apunta a Supabase
const isSupabase = (process.env.DATABASE_URL || '').includes('supabase');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,  // falla en 10s en vez de colgar
  idleTimeoutMillis: 30000,
  max: 10,
});

const INITIAL_RETRY_MS = 5000;
const MAX_RETRY_MS = 60000;
let retryDelayMs = INITIAL_RETRY_MS;

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (users)');
    retryDelayMs = INITIAL_RETRY_MS; // reset backoff tras conexión exitosa
    await runMigrations();
  } catch (err) {
    logger.error(`Error conectando a PostgreSQL (users): [${err.code}] ${err.message} — reintento en ${retryDelayMs / 1000}s`);
    setTimeout(connectDB, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS); // backoff exponencial con tope
  }
};

const runMigrations = async () => {
  // El servicio usa el esquema canónico (español): usuario / suscripcion / plan_suscripcion,
  // que ya existen en la base. No creamos las tablas inglesas (users/subscriptions).
  // Única migración no destructiva: columna google_id en `usuario` para OAuth.
  await pool.query(`ALTER TABLE usuario ADD COLUMN IF NOT EXISTS google_id VARCHAR(100)`).catch((e) => {
    logger.warn(`No se pudo asegurar usuario.google_id: ${e.message}`);
  });

  // Sanity check: confirmar que las tablas esperadas existen
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('usuario','suscripcion','plan_suscripcion')`
  );
  if (rows[0].n < 3) {
    logger.warn(`Esquema español incompleto: solo ${rows[0].n}/3 tablas (usuario/suscripcion/plan_suscripcion)`);
  } else {
    logger.info('✅ Esquema español verificado (usuario/suscripcion/plan_suscripcion)');
  }
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
