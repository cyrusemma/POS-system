/* ============================================================
   POS SYSTEM — AUTH HELPER
   ============================================================ */

async function requireAuth(allowedRoles = []) {
  try {
    const { data: { session }, error: sessErr } = await db.auth.getSession();
    if (sessErr || !session) { redirectToLogin(); return null; }

    const { data: profile, error: profErr } = await db
      .from('profiles').select('*').eq('id', session.user.id).single();

    if (profErr || !profile) { await db.auth.signOut(); redirectToLogin(); return null; }
    if (profile.status === 'inactive') { await db.auth.signOut(); redirectToLogin('inactive'); return null; }
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
      redirectByRole(profile.role); return null;
    }
    return profile;
  } catch (err) {
    console.error('requireAuth error:', err);
    redirectToLogin();
    return null;
  }
}

async function logout() {
  await db.auth.signOut();
  window.location.href = getPathDepth() + 'auth/login.html';
}

function redirectToLogin(reason = '') {
  const url = getPathDepth() + 'auth/login.html' + (reason ? '?reason=' + reason : '');
  window.location.href = url;
}

function redirectByRole(role) {
  const d = getPathDepth();
  if (role === 'admin')   { window.location.href = d + 'admin/dashboard.html'; return; }
  if (role === 'manager') { window.location.href = d + 'manager/dashboard.html'; return; }
  if (role === 'cashier') { window.location.href = d + 'cashier/pos.html'; return; }
  redirectToLogin();
}

function getPathDepth() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const subs  = ['auth','admin','manager','cashier','config'];
  return subs.includes(parts[parts.length - 2] || '') ? '../' : './';
}

function formatCurrency(amount) {
  return 'GH\u20B5 ' + (parseFloat(amount) || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2,'0')} ${ampm}`;
}

function generateSaleRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'INV-' + s;
}

function showAlert(elementId, message, type = 'danger') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = message;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

function populateSidebarUser(profile) {
  const n = document.getElementById('sidebarUserName');
  const r = document.getElementById('sidebarUserRole');
  if (n) n.textContent = profile.name || profile.email || 'User';
  if (r) r.textContent = profile.role || '';
}

/* ── THEME ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('pos-theme') || 'dark';
  _applyTheme(saved, false);
}

function toggleTheme() {
  const current = localStorage.getItem('pos-theme') || 'dark';
  _applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

function _applyTheme(theme, animate) {
  if (animate) {
    document.documentElement.style.transition = 'background 0.3s, color 0.3s';
    setTimeout(() => document.documentElement.style.transition = '', 400);
  }
  // Always set an explicit attribute so CSS selectors work on both pages
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  localStorage.setItem('pos-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  if (theme === 'light') {
    // Sun icon
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    // Moon icon
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

/* ── RATE LIMITING (Brute Force Protection) ─────────────────── */
const loginAttempts = { count: 0, firstAttempt: null, blockedUntil: null };

function recordLoginAttempt() {
  if (!loginAttempts.firstAttempt) loginAttempts.firstAttempt = Date.now();
  loginAttempts.count++;
}

function canAttemptLogin() {
  if (loginAttempts.blockedUntil && Date.now() < loginAttempts.blockedUntil) return false;
  // Reset if 15 minutes has passed
  if (loginAttempts.firstAttempt && Date.now() - loginAttempts.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.count = 0;
    loginAttempts.firstAttempt = null;
    loginAttempts.blockedUntil = null;
  }
  return true;
}

function getLoginBlockTime() {
  if (!loginAttempts.blockedUntil) return 0;
  const remaining = loginAttempts.blockedUntil - Date.now();
  return Math.ceil(remaining / 1000);
}

function applyLoginRateLimit() {
  if (loginAttempts.count >= 5) {
    // Block for 5 minutes after 5 failed attempts
    loginAttempts.blockedUntil = Date.now() + 5 * 60 * 1000;
    return true;
  }
  return false;
}
