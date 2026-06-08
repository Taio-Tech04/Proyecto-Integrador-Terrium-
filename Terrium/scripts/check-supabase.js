/**
 * check-supabase.js — Diagnóstico y fix del schema de Supabase
 * Ejecutar con: node scripts/check-supabase.js  (desde /Terrium)
 */
const { Pool } = require('../services/users/node_modules/pg');

const DB = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('🔌 Conectando a Supabase...');

  // 1. Listar tablas existentes
  const { rows: tablas } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log('\n📋 Tablas en public schema:');
  tablas.forEach(t => console.log(' -', t.table_name));

  // 2. Revisar investment_scores
  const { rows: scores } = await pool.query('SELECT neighborhood, score, trend FROM investment_scores LIMIT 5');
  console.log('\n📊 investment_scores (muestra):', JSON.stringify(scores, null, 2));

  // 3. Revisar market_metrics count
  const { rows: mm } = await pool.query('SELECT COUNT(*) as total FROM market_metrics');
  console.log('\n📈 market_metrics total:', mm[0].total);

  // 4. Verificar tablas faltantes
  const expected = ['users', 'listings', 'valuations', 'notifications', 'subscriptions'];
  const existing = tablas.map(t => t.table_name);
  const missing = expected.filter(t => !existing.includes(t));
  console.log('\n❌ Tablas faltantes:', missing.length ? missing.join(', ') : 'Ninguna');

  // 5. Tablas extra (con nombres en español)
  const extra = existing.filter(t => ['usuario', 'propiedad', 'publicacion', 'suscripcion'].includes(t));
  if (extra.length) console.log('⚠️  Tablas antiguas (nombres en español):', extra.join(', '));

  await pool.end();
  console.log('\n✅ Diagnóstico completo.');
}

run().catch(e => { console.error('Error fatal:', e.message); pool.end(); });

