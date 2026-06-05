/* heatmap.js — Terrium · Leaflet + Socket.io WebSocket */
const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : window.location.origin;

const TIER_PRO = ['PRO', 'ENTERPRISE'];

let map, heatLayer, allPoints = [];

// ── Inicializar mapa Leaflet ─────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([-34.6037, -58.3816], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
}

// ── Renderizar heatmap ───────────────────────────────────────────────────────
function renderHeatmap(points) {
  allPoints = points;
  if (heatLayer) map.removeLayer(heatLayer);

  const leafletPoints = points.map((p) => [p.lat, p.lng, p.intensity]);

  heatLayer = L.heatLayer(leafletPoints, {
    radius: 35,
    blur: 25,
    maxZoom: 17,
    gradient: { 0.2: '#4575b4', 0.4: '#91bfdb', 0.6: '#fee090', 0.8: '#fc8d59', 1.0: '#d73027' }
  }).addTo(map);

  // Estadísticas del panel
  const prices = points.filter((p) => p.avgPriceUsdM2).map((p) => p.avgPriceUsdM2);
  if (prices.length) {
    document.getElementById('max-price-stat').textContent  = `USD ${Math.max(...prices).toLocaleString('es-AR')}/m²`;
    document.getElementById('min-price-stat').textContent  = `USD ${Math.min(...prices).toLocaleString('es-AR')}/m²`;
    const byNeighborhood = {};
    points.forEach((p) => { if (p.neighborhood && p.avgPriceUsdM2) byNeighborhood[p.neighborhood] = p.avgPriceUsdM2; });
    const nbEntries = Object.entries(byNeighborhood);
    if (nbEntries.length) {
      const sorted = nbEntries.sort((a, b) => b[1] - a[1]);
      document.getElementById('most-expensive').textContent  = sorted[0][0];
      document.getElementById('least-expensive').textContent = sorted[sorted.length - 1][0];
    }
    document.getElementById('total-points').textContent = points.length;
  }
}

// ── Filtro por precio ────────────────────────────────────────────────────────
function applyPriceFilter(minPrice) {
  const filtered = minPrice === 0 ? allPoints : allPoints.filter((p) => p.avgPriceUsdM2 >= minPrice);
  if (heatLayer) map.removeLayer(heatLayer);
  const leafletPoints = filtered.map((p) => [p.lat, p.lng, p.intensity]);
  heatLayer = L.heatLayer(leafletPoints, {
    radius: 35, blur: 25, maxZoom: 17,
    gradient: { 0.2: '#4575b4', 0.4: '#91bfdb', 0.6: '#fee090', 0.8: '#fc8d59', 1.0: '#d73027' }
  }).addTo(map);
}

// ── Cargar datos iniciales via REST ─────────────────────────────────────────
async function loadHeatmapData() {
  try {
    const data = await apiFetch('/api/analytics/heatmap');
    renderHeatmap(data);
  } catch (err) {
    console.warn('Error cargando heatmap:', err.message);
    showToast('Error al cargar mapa de calor', 'error');
  }
}

// ── WebSocket en tiempo real ─────────────────────────────────────────────────
function connectWebSocket() {
  // Si socket.io no está disponible, usamos polling cada 30s
  if (typeof io !== 'undefined') {
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket conectado — actualizaciones en tiempo real activadas');
    });

    socket.on('heatmap:update', (data) => {
      if (data && Array.isArray(data)) {
        renderHeatmap(data);
      }
    });

    socket.on('disconnect', () => {
      console.warn('WebSocket desconectado. Reconectando...');
    });
  } else {
    // Fallback: polling cada 30 segundos
    setInterval(loadHeatmapData, 30000);
  }
}

// ── Control de tier (lock para FREE/INVERSOR) ────────────────────────────────
function checkTierAccess() {
  const tier = getUserTier();
  const lockOverlay = document.getElementById('tier-lock');

  if (!TIER_PRO.includes(tier)) {
    if (lockOverlay) lockOverlay.style.display = 'flex';
    return false;
  }
  if (lockOverlay) lockOverlay.style.display = 'none';
  return true;
}

// ── Inicio ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initMap();

  const hasAccess = checkTierAccess();
  if (!hasAccess) return; // Mostrar lock y no cargar datos

  await loadHeatmapData();
  connectWebSocket();

  // Filtro de precio
  const priceFilter = document.getElementById('price-filter');
  const priceVal    = document.getElementById('price-filter-val');

  priceFilter?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    priceVal.textContent = val === 0 ? 'Todos' : `≥ USD ${val.toLocaleString('es-AR')}`;
    applyPriceFilter(val);
  });
});
