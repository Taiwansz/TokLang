/* ===== CURSOR GLOW — RAF throttled ===== */
let glowX = 0, glowY = 0, glowRaf = false;
const glow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  glowX = e.clientX; glowY = e.clientY;
  if (!glowRaf) {
    glowRaf = true;
    requestAnimationFrame(() => {
      glow.style.left = glowX + 'px';
      glow.style.top  = glowY + 'px';
      glowRaf = false;
    });
  }
});

/* ===== REVEAL — with disconnect ===== */
let revealObserver = null;
function initReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 70);
    });
  }, { threshold: 0.08 });
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
  }, 100);
}

/* ===== ROUTER ===== */
const VALID_PAGES = ['home','app','docs','pricing','login','signup','forgot','dashboard'];

async function navigate(page) {
  if (typeof pagesLoaded !== 'undefined' && !pagesLoaded) {
    setTimeout(() => navigate(page), 50);
    return;
  }
  if (page === 'dashboard' && !(await getUser())) {
    showToast('Faça login para acessar o dashboard', '🔒');
    navigate('login');
    return;
  }
  // Reset forgot form state when leaving
  if (page !== 'forgot') resetForgotForm();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(a => a.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add('active');
  window.location.hash = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  initReveal();
  if (page === 'dashboard') initDashboard();
  if (page === 'app') { updateUsageUI(); }
}

function initRouter() {
  updateNavAuth();
  const hash = window.location.hash.replace('#','') || 'home';
  navigate(VALID_PAGES.includes(hash) ? hash : 'home');
}

/* ===== FAQ ===== */
function toggleFaq(el) {
  const item = el.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

/* ===== DOCS ===== */
function scrollToDoc(id, link) {
  document.querySelectorAll('.dns-link').forEach(l => l.classList.remove('active'));
  if (link) link.classList.add('active');
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ===== TOAST ===== */
let toastTimer;
function showToast(msg, icon = '✓') {
  const t = document.getElementById('global-toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ===== UTILS ===== */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ===== KEYBOARD SHORTCUTS ===== */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const page = document.querySelector('.page.active');
    if (!page) return;
    if (page.id === 'page-app') {
      if (e.shiftKey) {
        e.preventDefault();
        doExpand();
      } else {
        e.preventDefault();
        doCompress();
      }
    }
    if (page.id === 'page-login' && !e.shiftKey) doLogin();
    if (page.id === 'page-signup' && !e.shiftKey) doSignup();
  }
  if (e.key === 'Escape') {
    closeMobileMenu();
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  }
});
