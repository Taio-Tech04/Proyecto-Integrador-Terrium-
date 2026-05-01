/* API client centralizado */
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '/api-gateway';

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('terrium_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

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

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error en la solicitud');
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

