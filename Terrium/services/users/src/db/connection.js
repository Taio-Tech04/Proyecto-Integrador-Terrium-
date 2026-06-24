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
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(100),
      tier VARCHAR(20) DEFAULT 'FREE' CHECK (tier IN ('FREE','BASIC','PRO','ENTERPRISE')),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Agregar google_id a tablas existentes (idempotente)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(20) NOT NULL CHECK (plan IN ('FREE','BASIC','PRO','ENTERPRISE')),
      price_ars DECIMAL(10,2),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CANCELLED','EXPIRED','PENDING')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  logger.info('✅ Migraciones de users ejecutadas');
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };
