/* ===== DASHBOARD ===== */
const FAKE_HISTORY = [
  { orig:'Bom dia! Faça um código python com streamlit para calcular velocidade', tok:'cr $py @streamlit; calc velocidade; ui+', before:34, after:8, saving:76, date:'Hoje, 14:32' },
  { orig:'Preciso de uma API REST em Node com Express para usuários com CRUD', tok:'cr $js @express; #api CRUD users; prd', before:22, after:7, saving:68, date:'Hoje, 11:15' },
  { orig:'Explique closures em JavaScript com exemplos práticos por favor', tok:'ex $js closures; dk', before:11, after:4, saving:63, date:'Ontem, 18:44' },
  { orig:'Refatore essa função bagunçada pra ficar mais limpa e legível', tok:'rf $js; clean fn; cm', before:13, after:6, saving:54, date:'Ontem, 16:20' },
  { orig:'Cria um dashboard com Plotly e Streamlit de vendas mensais', tok:'cr $py @streamlit @plt; dashboard vendas; ui+', before:15, after:9, saving:40, date:'25/01, 09:11' },
  { orig:'Script python para web scraping e salvar em CSV', tok:'cr $py #scr; scraping; out[csv]', before:11, after:7, saving:36, date:'24/01, 20:05' },
  { orig:'Escreva testes unitários para esse módulo em TypeScript', tok:'tst $ts; unit; cm', before:10, after:5, saving:50, date:'23/01, 15:30' },
];

function initDashboard() {
  const tbody = document.getElementById('dash-recent-tbody');
  if (tbody) tbody.innerHTML = FAKE_HISTORY.slice(0,4).map(h => `
    <tr>
      <td>${escHtml(h.orig.substring(0,45))}...</td>
      <td class="tok">${escHtml(h.tok)}</td>
      <td class="saving">-${h.saving}%</td>
      <td>${h.date}</td>
    </tr>`).join('');

  const fh = document.getElementById('dash-full-history');
  if (fh) fh.innerHTML = FAKE_HISTORY.map((h,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escHtml(h.orig.substring(0,40))}...</td>
      <td class="tok">${escHtml(h.tok)}</td>
      <td>${h.before}</td>
      <td>${h.after}</td>
      <td class="saving">-${h.saving}%</td>
      <td>${h.date}</td>
    </tr>`).join('');

  // Session-based live usage merged with demo data
  const sessionUsed = getUsage();
  const totalUsed = 40 + sessionUsed; // 40 = demo baseline
  document.querySelectorAll('#dash-overview .metric-val').forEach((el, i) => {
    if (i === 0) el.textContent = totalUsed;
  });
  const usageFill = document.querySelector('#dash-overview .usage-bar-fill');
  if (usageFill) usageFill.style.width = ((totalUsed/500)*100).toFixed(1) + '%';
  const usageLabel = document.querySelector('#dash-overview .usage-bar-label span:last-child');
  if (usageLabel) usageLabel.textContent = totalUsed + ' / 500 compressões';

  buildMiniChart('mini-chart-1', [120,340,280,680,450,820,1200 + sessionUsed*40]);
  buildMiniChart('mini-chart-2', [3,8,6,14,9,12, 9 + sessionUsed]);

  const u = getUser();
  if (u?.apiKey) {
    const el = document.getElementById('api-key-display');
    const el2 = document.getElementById('api-key-code');
    if (el) el.textContent = u.apiKey.substring(0,8) + '••••••••••••••••••••••';
    if (el2) el2.textContent = u.apiKey.substring(0,12) + '...';
  }

  // Sync mobile user info
  if (u) syncDashUser(u);
}

function buildMiniChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  const max = Math.max(...data);
  el.innerHTML = data.map(v => `<div class="mc-bar" style="height:${Math.max(4, Math.round((v/max)*72))}px" title="${v}"></div>`).join('');
}

function showDashSection(name, navEl) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dash-nav-item').forEach(i => i.classList.remove('active'));
  const sec = document.getElementById('dash-' + name);
  if (sec) sec.classList.add('active');
  if (navEl) navEl.classList.add('active');
  else {
    document.querySelectorAll('.dash-nav-item').forEach(item => {
      if (item.getAttribute('onclick')?.includes("'"+name+"'")) item.classList.add('active');
    });
  }
  // Update mobile header title
  const titles = { overview:'Visão geral', history:'Histórico', api:'API & SDK', settings:'Configurações', billing:'Plano & cobrança' };
  const mTitle = document.getElementById('dash-mobile-section-title');
  if (mTitle) mTitle.textContent = titles[name] || name;
}

/* ===== API KEY ACTIONS ===== */
let apiRevealed = false;
function toggleApiKey() {
  const u = getUser(); if (!u) return;
  const el = document.getElementById('api-key-display');
  apiRevealed = !apiRevealed;
  el.textContent = apiRevealed ? u.apiKey : u.apiKey.substring(0,8) + '••••••••••••••••••••••';
  document.querySelectorAll('.api-key-btn')[0].textContent = apiRevealed ? 'Ocultar' : 'Revelar';
}
function copyApiKey() {
  const u = getUser(); if (!u) return;
  navigator.clipboard.writeText(u.apiKey).catch(()=>{});
  showToast('Chave de API copiada!', '📋');
}
function rotateApiKey() {
  if (!confirm('Tem certeza? A chave atual será invalidada imediatamente.')) return;
  const u = getUser(); if (!u) return;
  u.apiKey = 'tl_live_' + crypto.randomUUID().replace(/-/g,'').slice(0,16);
  saveUser(u);
  apiRevealed = false;
  document.getElementById('api-key-display').textContent = u.apiKey.substring(0,8) + '••••••••••••••••••••••';
  showToast('Chave de API rotacionada com sucesso!', '🔄');
}
function editName() {
  const u = getUser(); if (!u) return;
  const n = prompt('Novo nome:', u.name);
  if (n?.trim()) {
    u.name = n.trim(); saveUser(u); updateNavAuth();
    document.getElementById('set-name-display').textContent = u.name + ' ' + (u.last||'');
    showToast('Nome atualizado!', '✓');
  }
}
function confirmDeleteAccount() {
  if (confirm('Excluir sua conta permanentemente? Esta ação não pode ser desfeita.')) {
    doLogout(); showToast('Conta excluída.', '🗑');
  }
}

/* ===== MOBILE DASHBOARD ===== */
function openMobileMenu() {
  document.getElementById('dash-drawer').classList.add('open');
  document.getElementById('dash-overlay').style.display = 'block';
}
function closeMobileMenu() {
  document.getElementById('dash-drawer').classList.remove('open');
  document.getElementById('dash-overlay').style.display = 'none';
}
