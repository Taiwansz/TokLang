/* ===== AUTH STATE (Supabase) ===== */
const USAGE_KEY = 'tl_monthly_usage';

// Get current user from Supabase session
async function getUser() {
  const mock = sessionStorage.getItem('mock_user');
  if (mock) return JSON.parse(mock);

  if (!window.supabase || window.IS_DEMO) return null;
  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return null;
  
  const u = session.user;
  return {
    id: u.id,
    name: u.user_metadata.name || u.email.split('@')[0],
    last: u.user_metadata.last || '',
    email: u.email,
    plan: u.user_metadata.plan || 'starter',
    apiKey: u.user_metadata.apiKey || 'tl_live_...'
  };
}

/* ===== USAGE COUNTER (Simulado por enquanto) ===== */
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
}

/* ===== NAV AUTH STATE ===== */
async function updateNavAuth() {
  const u = await getUser();
  const out = document.getElementById('nav-logged-out');
  const inn = document.getElementById('nav-logged-in');
  const av  = document.getElementById('nav-avatar');
  if (u) {
    if (out) out.style.display = 'none';
    if (inn) inn.style.display = 'flex';
    const initials = ((u.name||'').charAt(0) + (u.last||'').charAt(0)).toUpperCase() || 'TL';
    if (av) av.textContent = initials;
    syncDashUser(u);
  } else {
    if (out) out.style.display = 'flex';
    if (inn) inn.style.display = 'none';
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

  const plan = u.plan || 'starter';
  ['dash-user-plan-desktop','dash-user-plan-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
      el.className = 'pill ' + (plan.toLowerCase() === 'starter' ? 'pill-green' : plan.toLowerCase() === 'pro' ? 'pill-blue' : 'pill-amber');
    }
  });
}

/* ===== AUTH FORMS ===== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  
  if (!err || !btn) return;
  err.style.display = 'none';

  if (!EMAIL_RE.test(email)) {
    err.textContent = 'Informe um e-mail válido.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = 'Entrando...';


  let error = null;
  if (window.supabase && !window.IS_DEMO) {
    const res = await window.supabase.auth.signInWithPassword({ email, password: pass });
    error = res.error;
  } else {
    // Mock successful login if Supabase isn't configured
    console.warn("Supabase not configured. Mocking login.");
    sessionStorage.setItem('mock_user', JSON.stringify({ email, name: email.split('@')[0] }));
  }


  if (error) {
    err.textContent = 'Erro: ' + error.message;
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Entrar';
    return;
  }

  updateNavAuth();
  btn.disabled = false; btn.textContent = 'Entrar';
  showToast('Bem-vindo de volta!', '✓');
  navigate('dashboard');
}

async function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const last  = document.getElementById('signup-last').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-password').value;
  const terms = document.getElementById('signup-terms').checked;
  const err   = document.getElementById('signup-error');
  const btn   = document.getElementById('signup-btn');

  if (!err || !btn) return;
  err.style.display = 'none';

  if (!name) { err.textContent = 'Informe seu nome.'; err.style.display = 'block'; return; }
  if (!EMAIL_RE.test(email)) { err.textContent = 'E-mail inválido.'; err.style.display = 'block'; return; }
  if (pass.length < 8) { err.textContent = 'Senha deve ter 8+ caracteres.'; err.style.display = 'block'; return; }
  if (!terms) { err.textContent = 'Aceite os termos.'; err.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Criando conta...';


  let error = null;
  if (window.supabase && !window.IS_DEMO) {
    const res = await window.supabase.auth.signUp({

    email,
    password: pass,
    options: {
      data: {
        name: name,
        last: last,
        plan: selectedPlan,
        apiKey: 'tl_live_' + Math.random().toString(36).substring(2, 15)
      }
    }
  });
    error = res.error;
  } else {
    console.warn("Supabase not configured. Mocking signup.");
    sessionStorage.setItem('mock_user', JSON.stringify({ email }));
  }

  if (error) {
    err.textContent = 'Erro: ' + error.message;
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Criar conta';
    return;
  }

  btn.disabled = false; btn.textContent = 'Criar conta grátis';
  showToast('Conta criada! Verifique seu e-mail.', '✓');
  navigate('login');
}

async function doLogout() {
  sessionStorage.removeItem('mock_user');
  if (window.supabase && !window.IS_DEMO) await window.supabase.auth.signOut();
  updateNavAuth();
  showToast('Sessão encerrada.', '✓');
  navigate('home');
}

async function oauthLogin(provider) {
  const { data, error } = await window.supabase.auth.signInWithOAuth({ provider });
  if (error) showToast('Erro no login social: ' + error.message, '!');
}

async function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  const { error } = await window.supabase.auth.resetPasswordForEmail(email);
  if (error) {
    const err = document.getElementById('forgot-error');
    if (err) { err.textContent = error.message; err.style.display = 'block'; }
  } else {
    document.getElementById('forgot-success').style.display = 'block';
  }
}

// Escutar mudanças de autenticação globalmente
if (window.supabase && !window.IS_DEMO) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth Event:', event);
    updateNavAuth();
  });
}

/* ===== SIGNUP HELPERS ===== */
let selectedPlan = 'starter';
function selectPlan(el, plan) {
  document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  selectedPlan = plan;
}

function checkPasswordStrength(val) {
  const bar = document.getElementById('pw-bar');
  const hint = document.getElementById('pw-hint');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ['', '#ff5e5e', '#f5a623', '#4d9fff', '#00ff88'];
  const labels = ['', 'Muito fraca', 'Fraca', 'Boa', 'Forte'];
  if (bar) { bar.style.width = (score * 25) + '%'; bar.style.background = colors[score] || ''; }
  if (hint) { hint.textContent = labels[score] || 'Crie uma senha forte'; }
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
