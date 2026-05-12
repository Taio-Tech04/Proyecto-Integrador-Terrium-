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

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Conectado a PostgreSQL (listings)');
    await runMigrations();
  } catch (err) {
    logger.error(`Error conectando a PostgreSQL (listings): [${err.code}] ${err.message}`);
    setTimeout(connectDB, 5000);
  }
};

const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      price_usd DECIMAL(12,2) NOT NULL,
      price_ars DECIMAL(14,2),
      surface_m2 DECIMAL(8,2) NOT NULL,
      rooms INT DEFAULT 0,
      type VARCHAR(30) DEFAULT 'DEPARTAMENTO' CHECK (type IN ('DEPARTAMENTO','CASA','PH','OFICINA','LOCAL','TERRENO')),
      neighborhood VARCHAR(100) NOT NULL,
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      status VARCHAR(20) DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','PAUSADO','VENDIDO','ALQUILADO')),
      owner_id VARCHAR(100),
      images JSONB DEFAULT '[]',
      amenities JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_listings_neighborhood ON listings(neighborhood);
    CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
  `);

  // Datos de ejemplo para CABA
  const { rows } = await pool.query('SELECT COUNT(*) FROM listings');
  if (parseInt(rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO listings (title, description, price_usd, surface_m2, rooms, type, neighborhood, lat, lng) VALUES
      ('Moderno departamento en Palermo Soho', 'Luminoso 2 ambientes a metros del parque. Amenities completos.', 185000, 55, 2, 'DEPARTAMENTO', 'Palermo', -34.5889, -58.4277),
      ('PH con terraza en Belgrano', 'Amplio PH con terraza privada y vista panorámica. Cochera incluida.', 320000, 120, 3, 'PH', 'Belgrano', -34.5601, -58.4568),
      ('Loft en Puerto Madero', 'Loft de diseño frente al río, piso 8. Edificio premium con seguridad 24hs.', 450000, 80, 1, 'DEPARTAMENTO', 'Puerto Madero', -34.6118, -58.3622),
      ('Casa en Villa Devoto', 'Casa familiar con jardín y parilla. Barrio tranquilo cerca de plaza.', 270000, 180, 4, 'CASA', 'Villa Devoto', -34.6148, -58.5234),
      ('Oficina en Microcentro', 'Oficina en piso 12 con vista a la ciudad. Apto profesional.', 95000, 45, 0, 'OFICINA', 'Microcentro', -34.6083, -58.3712),
      ('Departamento en Recoleta', '3 ambientes clásico con balcón en edificio de categoría.', 290000, 95, 3, 'DEPARTAMENTO', 'Recoleta', -34.5875, -58.3944),
      ('Departamento en Villa Crespo', 'Moderno 2 ambientes reciclado. Zona de bares y restaurantes.', 145000, 52, 2, 'DEPARTAMENTO', 'Villa Crespo', -34.5999, -58.4433),
      ('PH en San Telmo', 'PH con patio interno en barrio histórico. Ideal inversión.', 175000, 70, 2, 'PH', 'San Telmo', -34.6212, -58.3731),
      ('Departamento en Caballito', '3 ambientes con cochera. Barrio consolidado con todos los servicios.', 165000, 85, 3, 'DEPARTAMENTO', 'Caballito', -34.6189, -58.4402),
      ('Local comercial en Flores', 'Local a la calle en avenida comercial. 80m2 sin columnas.', 85000, 80, 0, 'LOCAL', 'Flores', -34.6312, -58.4648);
    `);
    logger.info('📦 Datos de ejemplo insertados en listings');
  }
};

module.exports = { pool, connectDB, query: (text, params) => pool.query(text, params) };

