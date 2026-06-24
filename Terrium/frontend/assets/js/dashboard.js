/* dashboard.js — Terrium */
/* global Chart, apiFetch, requireAuth */

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtUSD  = (n) => n ? `USD ${parseInt(n).toLocaleString('es-AR')}` : '—';
const fmtPct  = (n) => n ? `${parseFloat(n).toFixed(1)}%` : '—';

const TREND_COLORS = {
  ALZA:    { bg: 'rgba(40,167,69,0.2)',  border: '#28a745' },
  ESTABLE: { bg: 'rgba(108,117,125,0.2)', border: '#6c757d' },
  BAJA:    { bg: 'rgba(220,53,69,0.2)',   border: '#dc3545' }
};
const NEIGHBORHOOD_COLORS = [
  '#D4AF37','#1a3a5c','#28a745','#007bff','#fd7e14',
  '#6f42c1','#20c997','#dc3545','#17a2b8','#ff6384','#36a2eb','#ffce56'
];

// ── Normalizadores (la data puede venir de Supabase o del seed local) ──────────
// Tendencia: acepta inglés (UP/STABLE/DOWN) y español (ALZA/ESTABLE/BAJA)
const TREND_MAP = { UP: 'ALZA', STABLE: 'ESTABLE', DOWN: 'BAJA', ALZA: 'ALZA', ESTABLE: 'ESTABLE', BAJA: 'BAJA' };
const normalizeTrend = (t) => TREND_MAP[String(t || '').toUpperCase()] || 'ESTABLE';

// Score: el seed usa escala 0-10; Supabase usa 0-100. Normalizamos a 0-10.
const normalizeScore = (raw) => {
  const n = parseFloat(raw) || 0;
  return n > 10 ? n / 10 : n;
};

// Recomendación: si la fila no la trae (Supabase no tiene la columna), la generamos.
const buildRecommendation = (row) => {
  if (row.recommendation) return row.recommendation;
  if (row.details) return row.details;
  const s = normalizeScore(row.score);
  const t = normalizeTrend(row.trend);
  if (s >= 8.5 && t === 'ALZA') return 'Excelente oportunidad: alta demanda y fuerte potencial de valorización.';
  if (s >= 7.5) return 'Buena zona para invertir, con perspectivas positivas.';
  if (s >= 6.5) return 'Zona en desarrollo, a considerar a mediano plazo.';
  return 'Mercado maduro: mayor estabilidad, menor potencial de valorización.';
};

let trendsChart, scoreChart;

// Mapeo de origen de datos → presentación del badge
const DATA_SOURCE_BADGE = {
  caba_api:  { cls: 'ds-official',  label: 'Datos oficiales · GCBA', title: 'Datos provenientes de la API oficial del Gobierno de la Ciudad de Buenos Aires.' },
  scraper:   { cls: 'ds-secondary', label: 'Fuente secundaria',       title: 'Datos obtenidos por scraping del portal público de estadísticas (fuente secundaria).' },
  reference: { cls: 'ds-reference', label: 'Datos de referencia',      title: 'Valores estimados de referencia, NO datos reales de mercado.' },
  fallback:  { cls: 'ds-reference', label: 'Datos de referencia',      title: 'Datos sintéticos generados porque las fuentes oficiales no estuvieron disponibles. NO son datos reales de mercado.' }
};

function renderDataSourceBadge(source) {
  const badge = document.getElementById('data-source-badge');
  if (!badge) return;
  const cfg = DATA_SOURCE_BADGE[source];
  if (!cfg) { badge.style.display = 'none'; return; }
  badge.className = `ds-badge ${cfg.cls}`;
  badge.textContent = cfg.label;
  badge.title = cfg.title;
  badge.style.display = 'inline-flex';
}

// ── Cargar Overview ──────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const data = await apiFetch('/api/analytics/overview');
    document.getElementById('avg-price').textContent      = fmtUSD(data.avgPriceUsdM2);
    document.getElementById('total-listings').textContent  = data.totalListings != null ? Number(data.totalListings).toLocaleString('es-AR') : '—';
    document.getElementById('neighborhoods').textContent   = data.neighborhoodsCount || '—';
    const bestYield = data.topNeighborhoods?.[0]?.['yield_pct'];
    document.getElementById('best-yield').textContent     = fmtPct(bestYield);
    renderDataSourceBadge(data.dataSource);
  } catch (err) {
    console.warn('Overview no disponible:', err.message);
  }
}

// ── Cargar Trends (gráfico de líneas) ────────────────────────────────────────
async function loadTrends(months) {
  try {
    const rows = await apiFetch(`/api/analytics/trends?months=${months}`);

    // Agrupar por barrio
    const grouped = {};
    rows.forEach((r) => {
      if (!grouped[r.neighborhood]) grouped[r.neighborhood] = [];
      grouped[r.neighborhood].push({ label: `${r.month}/${r.year}`, price: parseFloat(r.avg_price_usd_m2) });
    });

    // Limitar a los 8 barrios con más datos para que la leyenda no desborde
    const neighborhoods = Object.keys(grouped)
      .sort((a, b) => grouped[b].length - grouped[a].length)
      .slice(0, 8);

    // Etiquetas del eje X ordenadas cronológicamente (año ASC, mes ASC)
    const labels = [...new Set(rows.map((r) => `${r.month}/${r.year}`))]
      .sort((a, b) => {
        const [ma, ya] = a.split('/').map(Number);
        const [mb, yb] = b.split('/').map(Number);
        return ya !== yb ? ya - yb : ma - mb;
      });

    const datasets = neighborhoods.map((n, i) => ({
      label: n,
      data: labels.map((l) => {
        const p = grouped[n].find((x) => x.label === l);
        return p ? p.price : null;
      }),
      borderColor: NEIGHBORHOOD_COLORS[i % NEIGHBORHOOD_COLORS.length],
      backgroundColor: 'transparent',
      tension: 0.4,
      spanGaps: true,
      borderWidth: 2,
      pointRadius: 3
    }));

    document.getElementById('chart-subtitle').textContent = `(${months} meses · top ${neighborhoods.length} barrios)`;

    const trendsCanvas = document.getElementById('trendsChart');
    if (!trendsCanvas) return;
    if (trendsChart) trendsChart.destroy();
    trendsChart = new Chart(trendsCanvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              font: { size: 10 },
              padding: 8,
              // Máximo 4 items por fila para no desbordar
              maxWidth: 400
            }
          }
        },
        scales: {
          y: { ticks: { callback: (v) => `$${v.toLocaleString()}` }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 10 } } }
        }
      }
    });
  } catch (err) {
    console.warn('Trends no disponible:', err.message);
  }
}

// ── Cargar Ranking + Score Chart ─────────────────────────────────────────────
async function loadRanking() {
  const loading = document.getElementById('ranking-loading');
  const table   = document.getElementById('ranking-table');
  const tbody   = document.getElementById('ranking-body');

  try {
    // El endpoint devuelve { data: [...], total, page, limit }; soportamos también un array plano.
    const res  = await apiFetch('/api/analytics/ranking');
    const rows = Array.isArray(res) ? res : (res?.data || []);

    // Score bar chart
    const scoreCanvas = document.getElementById('scoreChart');
    if (scoreChart) scoreChart.destroy();
    if (scoreCanvas) {
    scoreChart = new Chart(scoreCanvas, {
      type: 'bar',
      data: {
        labels: rows.slice(0, 8).map((r) => r.neighborhood),
        datasets: [{
          label: 'Score',
          data: rows.slice(0, 8).map((r) => normalizeScore(r.score)),
          backgroundColor: rows.slice(0, 8).map((r) => TREND_COLORS[normalizeTrend(r.trend)].bg),
          borderColor: rows.slice(0, 8).map((r) => TREND_COLORS[normalizeTrend(r.trend)].border),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 10, ticks: { stepSize: 2 } },
          y: { grid: { display: false } }
        }
      }
    });
    } // fin if (scoreCanvas)

    const TREND_LABEL = { ALZA: 'ALZA', ESTABLE: 'ESTABLE', BAJA: 'BAJA' };
    tbody.innerHTML = rows.map((r, i) => {
      const trend      = normalizeTrend(r.trend);
      const score      = normalizeScore(r.score);
      const trendClass = trend === 'ALZA' ? 'trend-up' : trend === 'BAJA' ? 'trend-down' : 'trend-stable';
      const trendIcon  = trend === 'ALZA' ? '↑' : trend === 'BAJA' ? '↓' : '→';
      const scorePct   = Math.round((score / 10) * 100);
      return `<tr>
        <td><strong>#${i+1}</strong></td>
        <td><strong>${r.neighborhood}</strong></td>
        <td>
          <div class="score-cell">
            <span class="score-value">${score.toFixed(1)}</span>
            <div class="score-bar"><div class="score-bar-fill" data-pct="${scorePct}"></div></div>
          </div>
        </td>
        <td>${fmtPct(r.yield_pct)}</td>
        <td><span class="${trendClass}">${trendIcon} ${TREND_LABEL[trend]}</span></td>
        <td class="recommendation-cell">${buildRecommendation(r)}</td>
      </tr>`;
    }).join('');

    // Aplicar ancho de barras vía JS (evita que el parser CSS de WebStorm analice valores dinámicos)
    tbody.querySelectorAll('.score-bar-fill[data-pct]').forEach((el) => {
      el.style.width = (el.getAttribute('data-pct') || '0') + '%';
    });

    if (loading) loading.style.display = 'none';
    if (table) table.style.display = 'table';
    document.getElementById('last-update').textContent = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch (err) {
    if (loading) loading.innerHTML = '<p class="error-text">Error al cargar ranking.</p>';
    console.warn('Ranking no disponible:', err.message);
  }
}

// ── Inicio ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Redirigir a login si no está autenticado (evita parpadeo y errores de consola)
  if (!requireAuth()) return;

  const monthsFilter = document.getElementById('months-filter');

  await Promise.all([loadOverview(), loadTrends(monthsFilter?.value || 6), loadRanking()]);

  monthsFilter?.addEventListener('change', (e) => loadTrends(e.target.value));
});
