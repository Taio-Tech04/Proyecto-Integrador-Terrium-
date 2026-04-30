/* dashboard.js — Terrium */
const MONTHS = parseInt(document.getElementById('months-filter')?.value || 6);

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

let trendsChart, scoreChart;

// ── Cargar Overview ──────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const data = await apiFetch('/api/analytics/overview');
    document.getElementById('avg-price').textContent      = fmtUSD(data.avgPriceUsdM2);
    document.getElementById('total-listings').textContent  = data.totalListings?.toLocaleString('es-AR') || '—';
    document.getElementById('neighborhoods').textContent   = data.neighborhoodsCount || '—';
    const bestYield = data.topNeighborhoods?.[0]?.yield_pct;
    document.getElementById('best-yield').textContent     = fmtPct(bestYield);
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

    const neighborhoods = Object.keys(grouped);
    // Etiquetas del eje X (fechas únicas ordenadas)
    const labels = [...new Set(rows.map((r) => `${r.month}/${r.year}`))];

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

    document.getElementById('chart-subtitle').textContent = `(${months} meses)`;

    if (trendsChart) trendsChart.destroy();
    trendsChart = new Chart(document.getElementById('trendsChart'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: { ticks: { callback: (v) => `$${v.toLocaleString()}` }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } }
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
    const rows = await apiFetch('/api/analytics/ranking');

    // Score bar chart
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(document.getElementById('scoreChart'), {
      type: 'bar',
      data: {
        labels: rows.slice(0, 8).map((r) => r.neighborhood),
        datasets: [{
          label: 'Score',
          data: rows.slice(0, 8).map((r) => parseFloat(r.score)),
          backgroundColor: rows.slice(0, 8).map((r) => {
            const t = r.trend || 'ESTABLE';
            return TREND_COLORS[t]?.bg || 'rgba(212,175,55,0.4)';
          }),
          borderColor: rows.slice(0, 8).map((r) => {
            const t = r.trend || 'ESTABLE';
            return TREND_COLORS[t]?.border || '#D4AF37';
          }),
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

    // Tabla ranking
    tbody.innerHTML = rows.map((r, i) => {
      const trendClass = r.trend === 'ALZA' ? 'trend-up' : r.trend === 'BAJA' ? 'trend-down' : 'trend-stable';
      const trendIcon  = r.trend === 'ALZA' ? '↑' : r.trend === 'BAJA' ? '↓' : '→';
      const scorePct   = Math.round((parseFloat(r.score) / 10) * 100);
      return `<tr>
        <td><strong>#${i+1}</strong></td>
        <td><strong>${r.neighborhood}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:var(--navy)">${parseFloat(r.score).toFixed(1)}</span>
            <div class="score-bar"><div class="score-bar-fill" style="width:${scorePct}%"></div></div>
          </div>
        </td>
        <td>${fmtPct(r.yield_pct)}</td>
        <td><span class="${trendClass}">${trendIcon} ${r.trend}</span></td>
        <td style="font-size:0.82rem;color:var(--gray-600);max-width:200px">${r.recommendation || '—'}</td>
      </tr>`;
    }).join('');

    if (loading) loading.style.display = 'none';
    if (table) table.style.display = 'table';
    document.getElementById('last-update').textContent = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch (err) {
    if (loading) loading.innerHTML = '<p style="color:var(--red);">Error al cargar ranking.</p>';
    console.warn('Ranking no disponible:', err.message);
  }
}

// ── Inicio ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const monthsFilter = document.getElementById('months-filter');

  await Promise.all([loadOverview(), loadTrends(monthsFilter?.value || 6), loadRanking()]);

  monthsFilter?.addEventListener('change', (e) => loadTrends(e.target.value));
});

