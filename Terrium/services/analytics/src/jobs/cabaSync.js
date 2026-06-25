const axios = require('axios');
const cron = require('node-cron');
const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { NEIGHBORHOOD_MAP, BASE_PRICES } = require('../utils/constants');
const { tryScrapeSupplement } = require('./scraper');

function normalizeNeighborhood(name) {
  if (!name) return null;
  return NEIGHBORHOOD_MAP[name.toLowerCase().trim()] || null;
}

async function fetchFromCABAAPI() {
  const url = process.env.CABA_API_URL || 'https://data.buenosaires.gob.ar/api/3/action/datastore_search';
  const resourceId = process.env.CABA_RESOURCE_ID || 'e4bc6e71-7a0a-4a7b-8a36-0b82a5d9f42c';
  const headers = process.env.CABA_API_KEY ? { Authorization: process.env.CABA_API_KEY } : {};
  const res = await axios.get(url, { params: { resource_id: resourceId, limit: 500 }, timeout: 15000, headers });
  if (!res.data?.result?.records) throw new Error('Formato inesperado');
  return res.data.result.records;
}

function generateFallbackData() {
  const now = new Date();
  return Object.entries(BASE_PRICES).map(([n, base]) => ({
    neighborhood: n,
    avg_price_usd_m2: Math.round(base * (0.97 + Math.random() * 0.06)),
    total_listings: Math.floor(Math.random() * 80) + 20,
    month: now.getMonth() + 1,
    year: now.getFullYear()
  }));
}

function processRecords(records) {
  const grouped = {};
  for (const r of records) {
    const n = normalizeNeighborhood(r.barrio || r.BARRIO);
    if (!n) continue;
    const p = parseFloat(r.precio_m2 || r.PRECIO_M2 || 0);
    if (p <= 0 || p > 20000) continue;
    if (!grouped[n]) grouped[n] = { sum: 0, count: 0 };
    grouped[n].sum += p;
    grouped[n].count++;
  }
  const now = new Date();
  return Object.entries(grouped).map(([n, d]) => ({
    neighborhood: n,
    avg_price_usd_m2: Math.round(d.sum / d.count),
    total_listings: d.count,
    month: now.getMonth() + 1,
    year: now.getFullYear()
  }));
}

// source: 'caba_api' (oficial) | 'scraper' (secundaria) | 'fallback' (sintética)
// Escribe en el esquema canónico `datos_mercado` (FK a `zona`, period_month como fecha).
// Los barrios sin zona registrada se omiten (no hay FK destino).
async function upsertMetrics(metrics, source) {
  let count = 0;
  for (const m of metrics) {
    const { rows } = await query('SELECT zone_id FROM zona WHERE name ILIKE $1 LIMIT 1', [m.neighborhood]);
    if (!rows.length) {
      logger.warn(`Sin zona para "${m.neighborhood}" — métrica omitida`);
      continue;
    }
    await query(
      `INSERT INTO datos_mercado (zone_id, period_month, avg_price_m2, total_listings, data_source)
       VALUES ($1, make_date($2,$3,1), $4, $5, $6)
       ON CONFLICT (zone_id, period_month)
       DO UPDATE SET avg_price_m2=$4, total_listings=$5, data_source=$6`,
      [rows[0].zone_id, m.year, m.month, m.avg_price_usd_m2, m.total_listings, source]
    ).catch((e) => logger.warn(`Upsert ${m.neighborhood}: ${e.message}`));
    count++;
  }
  return count;
}

async function syncCABAData() {
  logger.info('Sync CABA iniciado...');
  let metrics;
  let source = 'caba_api';
  try {
    const records = await fetchFromCABAAPI();
    metrics = processRecords(records);
    logger.info(`API CABA: ${metrics.length} barrios procesados`);
  } catch (err) {
    logger.warn(`API CABA no disponible: ${err.message} — intentando scraper como fuente secundaria`);

    // Fuente secundaria: web scraping del portal público de estadísticas de CABA
    const scraped = await tryScrapeSupplement();
    if (scraped && scraped.length > 0) {
      source = 'scraper';
      const now = new Date();
      metrics = scraped.map(r => ({
        neighborhood: normalizeNeighborhood(r.neighborhood) || r.neighborhood,
        avg_price_usd_m2: r.avg_price_usd_m2,
        total_listings: 0,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      })).filter(r => r.neighborhood);
      logger.info(`Scraper: ${metrics.length} barrios obtenidos como fuente secundaria`);
    } else {
      source = 'fallback';
      logger.warn('⚠️  Scraper también falló — generando DATOS SINTÉTICOS de referencia (data_source=fallback). NO son datos reales de mercado.');
      metrics = generateFallbackData();
    }
  }
  const n = await upsertMetrics(metrics, source);
  logger.info(`${n} métricas actualizadas en DB (origen: ${source})`);
}

function startSyncJob() {
  const interval = process.env.CABA_SYNC_INTERVAL_MIN;
  if (interval) {
    cron.schedule(`*/${interval} * * * *`, syncCABAData);
    logger.info(`CABA sync: cada ${interval} minutos`);
  } else {
    cron.schedule('0 3 * * *', syncCABAData, { timezone: 'America/Argentina/Buenos_Aires' });
    logger.info('CABA sync: diariamente 3:00 AM Buenos Aires');
  }
  setTimeout(async () => {
    try {
      const { rows } = await query('SELECT COUNT(*) FROM datos_mercado');
      if (parseInt(rows[0].count) === 0) await syncCABAData();
    } catch (_) {}
  }, 8000);
}

module.exports = { startSyncJob };
