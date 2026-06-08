/**
 * Web Scraper de datos inmobiliarios complementarios.
 *
 * ⚠️  IMPORTANTE — ÉTICA Y LEGALIDAD DEL WEB SCRAPING:
 *  - Siempre verificar los Términos de Servicio del sitio antes de scrapear.
 *  - Respetar el archivo robots.txt de cada sitio.
 *  - No sobrecargar el servidor: usar delays entre peticiones.
 *  - Solo usar esta técnica en fuentes de datos PÚBLICAS que lo permitan.
 *  - Este módulo solo accede a portales de datos abiertos del gobierno argentino.
 *
 * Fuente: Buenos Aires Data — estadísticas de mercado inmobiliario
 * URL: https://www.estadisticaciudad.gob.ar (portal público de estadísticas de CABA)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const SCRAPER_CONFIG = {
  // Portal de estadísticas del gobierno de CABA — datos abiertos
  baseUrl: 'https://www.estadisticaciudad.gob.ar/eyc/?cat=39',
  timeout: 20000,
  headers: {
    'User-Agent': 'Terrium-DataBot/1.0 (plataforma-educativa; contacto@terrium.ar)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'es-AR,es;q=0.9'
  }
};

/**
 * Transforma el texto de un precio en número.
 * Ej: "3.200" → 3200, "2,850" → 2850
 */
function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned.replace(/\./g, (m, o, s) =>
    o === s.lastIndexOf('.') ? '.' : ''
  ));
  return isNaN(value) || value <= 0 || value > 20000 ? null : Math.round(value);
}

/**
 * Scrapea la tabla de precios de mercado del portal de estadísticas de CABA.
 * Si el sitio cambia su estructura HTML, se lanza un error y el sistema usa el fallback.
 *
 * @returns {Array<{neighborhood: string, avg_price_usd_m2: number}>}
 */
async function scrapeCABAMarketReport() {
  logger.info('Scraper: iniciando extracción de estadisticaciudad.gob.ar...');

  const response = await axios.get(SCRAPER_CONFIG.baseUrl, {
    timeout: SCRAPER_CONFIG.timeout,
    headers: SCRAPER_CONFIG.headers
  });

  const $ = cheerio.load(response.data);
  const results = [];

  // Buscar tablas con datos de precios por barrio
  // La estructura típica de las tablas del portal de CABA es:
  // <table> <thead> <tr> <th>Barrio</th> <th>Precio USD/m²</th> ... </thead> <tbody> ...
  $('table').each((_i, table) => {
    const headers = [];
    $(table).find('thead th, thead td').each((_j, th) => {
      headers.push($(th).text().toLowerCase().trim());
    });

    // Detectar si la tabla tiene columnas de barrio y precio
    const barrioIdx = headers.findIndex(h => h.includes('barrio') || h.includes('zona'));
    const precioIdx = headers.findIndex(h => h.includes('precio') || h.includes('usd') || h.includes('m²'));

    if (barrioIdx === -1 || precioIdx === -1) return;

    $(table).find('tbody tr').each((_k, row) => {
      const cells = $(row).find('td');
      const neighborhood = $(cells[barrioIdx]).text().trim();
      const priceText    = $(cells[precioIdx]).text().trim();
      const price        = parsePrice(priceText);

      if (neighborhood && price) {
        results.push({ neighborhood, avg_price_usd_m2: price });
      }
    });
  });

  if (results.length === 0) {
    throw new Error('Scraper: no se encontraron datos en la tabla esperada — estructura HTML puede haber cambiado');
  }

  logger.info(`Scraper: ${results.length} registros extraídos de estadisticaciudad.gob.ar`);
  return results;
}

/**
 * Intenta scrapear datos del portal de CABA.
 * Si falla (sitio caído, estructura cambiada, etc.), retorna null para que
 * el llamador use el fallback habitual.
 */
async function tryScrapeSupplement() {
  try {
    return await scrapeCABAMarketReport();
  } catch (err) {
    logger.warn(`Scraper no disponible: ${err.message}`);
    return null;
  }
}

module.exports = { tryScrapeSupplement };
