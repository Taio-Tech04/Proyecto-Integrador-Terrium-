/* API client centralizado */
// Siempre usa rutas relativas → nginx las proxea al gateway sin CORS
const API_BASE = '';

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('terrium_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Timeout de 15 segundos para evitar carga infinita
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('El servidor no responde. Verificá tu conexión e intentá de nuevo.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    localStorage.removeItem('terrium_token');
    localStorage.removeItem('terrium_user');
    window.location.href = '/login.html';
    return;
  }

  if (response.status === 403) {
    showUpgradeModal();
    throw new Error('Suscripción insuficiente');
  }

  // Respuestas sin cuerpo (204 No Content, 205 Reset Content)
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_e) {
    throw new Error('Respuesta inválida del servidor');
  }
  if (!response.ok) throw new Error(data?.error || 'Error en la solicitud');
  return data;
};

const showUpgradeModal = () => {
  const modal = document.getElementById('upgrade-modal');
  if (modal) modal.style.display = 'flex';
};

// Toast notifications
const showToast = (message, type = 'success') => {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3500);
};

window.apiFetch = apiFetch;
window.showToast = showToast;
