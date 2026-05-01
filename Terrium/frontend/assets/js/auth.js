const getToken = () => localStorage.getItem('terrium_token');
const getUser = () => { try { return JSON.parse(localStorage.getItem('terrium_user')); } catch { return null; } };
const isAuthenticated = () => !!getToken();
const getUserTier = () => getUser()?.tier || 'FREE';

const logout = () => {
  localStorage.removeItem('terrium_token');
  localStorage.removeItem('terrium_user');
  window.location.href = '/index.html';
};

const requireAuth = () => {
  if (!isAuthenticated()) { window.location.href = '/login.html'; return false; }
  return true;
};

const updateNavbar = () => {
  const user = getUser();
  const userInfo = document.getElementById('user-info');
  const tierBadge = document.getElementById('user-tier-badge');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (user) {
    if (userInfo) { userInfo.style.display = 'flex'; userInfo.querySelector('.user-name').textContent = user.name || user.email; }
    if (tierBadge) { tierBadge.textContent = user.tier; tierBadge.className = `badge badge-${user.tier.toLowerCase()}`; }
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) { logoutBtn.style.display = 'flex'; logoutBtn.addEventListener('click', logout); }
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', updateNavbar);

window.getToken = getToken;
window.getUser = getUser;
window.isAuthenticated = isAuthenticated;
window.getUserTier = getUserTier;
window.logout = logout;
window.requireAuth = requireAuth;

