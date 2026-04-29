/* ===== AUTH STATE ===== */
const AUTH_KEY  = 'tl_auth_user';
const USAGE_KEY = 'tl_monthly_usage';

function getUser() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } }
function saveUser(u) { localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }
function clearUser() { localStorage.removeItem(AUTH_KEY); }

/* ===== USAGE COUNTER (sessionStorage — resets per session, simulates monthly limit) ===== */
function getUsage() { return parseInt(sessionStorage.getItem(USAGE_KEY) || '0', 10); }
function incUsage()  { const v = getUsage() + 1; sessionStorage.setItem(USAGE_KEY, v); return v; }

function updateUsageUI() {
  const used = getUsage();
  const limit = 500;
  const pct = Math.min((used / limit) * 100, 100);
  const el = document.getElementById('uc-used');
  const fill = document.getElementById('uc-fill');
  if (el) el.textContent = used;
  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'uc-fill' + (pct >= 100 ? ' full' : pct >= 80 ? ' warn' : '');
  }
  const banner = document.getElementById('limit-banner');
  if (banner) banner.style.display = pct >= 80 && pct < 100 ? 'block' : 'none';
}

/* ===== NAV AUTH STATE ===== */
function updateNavAuth() {
  const u = getUser();
  const out = document.getElementById('nav-logged-out');
  const inn = document.getElementById('nav-logged-in');
  const av  = document.getElementById('nav-avatar');
  if (u) {
    out.style.display = 'none';
    inn.style.display = 'flex';
    const initials = ((u.name||'').charAt(0) + (u.last||'').charAt(0)).toUpperCase() || 'TL';
    if (av) av.textContent = initials;
    syncDashUser(u);
  } else {
    out.style.display = 'flex';
    inn.style.display = 'none';
  }
}

function syncDashUser(u) {
  const initials = ((u.name||'').charAt(0) + (u.last||'').charAt(0)).toUpperCase() || 'TL';
  ['dash-avatar-txt','dash-avatar-mobile'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = initials;
  });
  ['dash-user-name','dash-user-name-mobile'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = u.name || 'Usuário';
  });
  const sn = document.getElementById('set-name-display');
  if (sn) sn.textContent = (u.name||'') + ' ' + (u.last||'');
  const se = document.getElementById('set-email-display');
  if (se) se.textContent = u.email || '';
}

/* ===== AUTH FORMS ===== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  err.style.display = 'none';
  if (!EMAIL_RE.test(email)) {
    err.textContent = 'Informe um e-mail válido (ex: nome@empresa.com).';
    err.style.display = 'block';
    document.getElementById('login-email').classList.add('error');
    return;
  }
  document.getElementById('login-email').classList.remove('error');
  if (pass.length < 4) {
    err.textContent = 'Senha muito curta. Mínimo 4 caracteres.';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true; btn.textContent = 'Verificando...';
  setTimeout(() => {
    const parts = email.split('@')[0].split('.');
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const last = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
    saveUser({ name, last, email, plan:'starter', apiKey:'tl_live_' + crypto.randomUUID().replace(/-/g,'').slice(0,16) });
    updateNavAuth();
    btn.disabled = false; btn.textContent = 'Entrar';
    showToast('Bem-vindo de volta, ' + name + '!', '👋');
    navigate('dashboard');
  }, 900);
}

function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const last  = document.getElementById('signup-last').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-password').value;
  const terms = document.getElementById('signup-terms').checked;
  const err   = document.getElementById('signup-error');
  const btn   = document.getElementById('signup-btn');
  err.style.display = 'none';
  if (!name || name.length < 2) { err.textContent = 'Informe seu nome (mínimo 2 caracteres).'; err.style.display = 'block'; return; }
  if (!EMAIL_RE.test(email)) { err.textContent = 'Informe um e-mail válido (ex: nome@empresa.com).'; err.style.display = 'block'; return; }
  if (pass.length < 8) { err.textContent = 'Senha deve ter pelo menos 8 caracteres.'; err.style.display = 'block'; return; }
  if (!terms) { err.textContent = 'Aceite os termos para continuar.'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Criando conta...';
  setTimeout(() => {
    saveUser({ name, last, email, plan: selectedPlan, apiKey:'tl_live_' + crypto.randomUUID().replace(/-/g,'').slice(0,16) });
    updateNavAuth();
    btn.disabled = false; btn.textContent = 'Criar conta grátis';
    showToast('Conta criada! Bem-vindo ao TokLang 🎉', '🎉');
    navigate('dashboard');
  }, 1100);
}

function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  const err   = document.getElementById('forgot-error');
  const btn   = document.getElementById('forgot-btn');
  err.style.display = 'none';
  if (!EMAIL_RE.test(email)) {
    err.textContent = 'Informe um e-mail válido (ex: nome@empresa.com).';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true; btn.textContent = 'Enviando...';
  setTimeout(() => {
    document.getElementById('forgot-btn').style.display = 'none';
    document.querySelector('#page-forgot .form-btn-ghost').style.display = 'none';
    document.querySelector('#page-forgot .auth-body p').style.display = 'none';
    document.querySelector('#page-forgot .form-group').style.display = 'none';
    document.getElementById('forgot-success').style.display = 'block';
  }, 1000);
}

function resetForgotForm() {
  const btn = document.getElementById('forgot-btn');
  const ghost = document.querySelector('#page-forgot .form-btn-ghost');
  const p = document.querySelector('#page-forgot .auth-body p');
  const fg = document.querySelector('#page-forgot .form-group');
  const success = document.getElementById('forgot-success');
  const err = document.getElementById('forgot-error');
  const input = document.getElementById('forgot-email');
  if (btn) { btn.style.display = ''; btn.disabled = false; btn.textContent = 'Enviar link de recuperação'; }
  if (ghost) ghost.style.display = '';
  if (p) p.style.display = '';
  if (fg) fg.style.display = '';
  if (success) success.style.display = 'none';
  if (err) err.style.display = 'none';
  if (input) input.value = '';
}

function oauthLogin(provider) {
  showToast('Simulando autenticação OAuth via ' + provider + '...', '🔐');
  setTimeout(() => {
    saveUser({ name:'Twn', last:'', email:'twn@gmail.com', plan:'starter', apiKey:'tl_live_' + crypto.randomUUID().replace(/-/g,'').slice(0,16) });
    updateNavAuth();
    showToast('Logado via ' + provider + '!', '✓');
    navigate('dashboard');
  }, 1200);
}

function doLogout() {
  clearUser();
  updateNavAuth();
  showToast('Sessão encerrada. Até logo!', '👋');
  navigate('home');
}

/* ===== SIGNUP HELPERS ===== */
let selectedPlan = 'starter';
function selectPlan(el, plan) {
  document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPlan = plan;
}

function checkPasswordStrength(val) {
  const bar  = document.getElementById('pw-bar');
  const hint = document.getElementById('pw-hint');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ['','#ff5e5e','#f5a623','#4d9fff','#00ff88'];
  const labels = ['','Muito fraca','Fraca','Boa','Forte 💪'];
  if (bar) { bar.style.width = (score * 25) + '%'; bar.style.background = colors[score] || ''; }
  if (hint) { hint.textContent = labels[score] || 'Crie uma senha forte'; hint.style.color = colors[score] || 'var(--muted)'; }
}
