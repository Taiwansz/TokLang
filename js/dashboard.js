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

async function initDashboard() {
  const u = await getUser();
  if (!u) { navigate('login'); return; }

  const tbody = document.getElementById('dash-recent-tbody');
  const fh = document.getElementById('dash-full-history');

  // Fetch real data from Supabase
  const { data: dbHistory, error, count } = await supabase
    .from('history')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (!error && dbHistory) {
    if (tbody) tbody.innerHTML = dbHistory.slice(0,4).map(h => `
      <tr>
        <td>${escHtml(h.original_text.substring(0,45))}...</td>
        <td class="tok">${escHtml(h.compressed_text)}</td>
        <td class="saving">-${h.savings_pct}%</td>
        <td>${new Date(h.created_at).toLocaleDateString('pt-BR')}</td>
      </tr>`).join('');

    if (fh) fh.innerHTML = dbHistory.map((h,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${escHtml(h.original_text.substring(0,40))}...</td>
        <td class="tok">${escHtml(h.compressed_text)}</td>
        <td>${h.tokens_before}</td>
        <td>${h.tokens_after}</td>
        <td class="saving">-${h.savings_pct}%</td>
        <td>${new Date(h.created_at).toLocaleString('pt-BR')}</td>
      </tr>`).join('');
  }

  // Real usage metrics
  const totalUsed = count || 0;
  document.querySelectorAll('#dash-overview .metric-val').forEach((el, i) => {
    if (i === 0) el.textContent = totalUsed;
    if (i === 1) el.textContent = totalUsed > 0 ? (dbHistory.reduce((acc, curr) => acc + curr.savings_pct, 0) / totalUsed).toFixed(0) + '%' : '0%';
  });
  
  const usageFill = document.querySelector('#dash-overview .usage-bar-fill');
  if (usageFill) usageFill.style.width = ((totalUsed/500)*100).toFixed(1) + '%';
  const usageLabel = document.querySelector('#dash-overview .usage-bar-label span:last-child');
  if (usageLabel) usageLabel.textContent = totalUsed + ' / 500 compressões';

  buildMiniChart('mini-chart-1', [120,340,280,680,450,820,totalUsed * 10]);
  buildMiniChart('mini-chart-2', [3,8,6,14,9,12, totalUsed]);

  if (u.apiKey) {
    const el = document.getElementById('api-key-display');
    const el2 = document.getElementById('api-key-code');
    if (el) el.textContent = u.apiKey.substring(0,8) + '••••••••••••••••••••••';
    if (el2) el2.textContent = u.apiKey.substring(0,12) + '...';
  }

  // Sync user info
  syncDashUser(u);
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
async function toggleApiKey() {
  const u = await getUser(); if (!u) return;
  const el = document.getElementById('api-key-display');
  apiRevealed = !apiRevealed;
  el.textContent = apiRevealed ? u.apiKey : u.apiKey.substring(0,8) + '••••••••••••••••••••••';
  document.querySelectorAll('.api-key-btn')[0].textContent = apiRevealed ? 'Ocultar' : 'Revelar';
}

async function copyApiKey() {
  const u = await getUser(); if (!u) return;
  navigator.clipboard.writeText(u.apiKey).catch(()=>{});
  showToast('Chave de API copiada!', '📋');
}

async function rotateApiKey() {
  if (!confirm('Tem certeza? A chave atual será invalidada imediatamente.')) return;
  const u = await getUser(); if (!u) return;
  const newKey = 'tl_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const { error } = await supabase.auth.updateUser({
    data: { apiKey: newKey }
  });

  if (error) {
    showToast('Erro ao rotacionar chave: ' + error.message, '⚠');
    return;
  }

  apiRevealed = false;
  document.getElementById('api-key-display').textContent = newKey.substring(0,8) + '••••••••••••••••••••••';
  showToast('Chave de API rotacionada!', '🔄');
}

async function editName() {
  const u = await getUser(); if (!u) return;
  const n = prompt('Novo nome:', u.name);
  if (n?.trim()) {
    const { error } = await supabase.auth.updateUser({
      data: { name: n.trim() }
    });
    if (error) {
      showToast('Erro ao atualizar nome: ' + error.message, '⚠');
      return;
    }
    updateNavAuth();
    showToast('Nome atualizado!', '✓');
  }
}

async function confirmDeleteAccount() {
  if (confirm('Excluir sua conta permanentemente? Esta ação não pode ser desfeita.')) {
    // Nota: Exclusão de conta via SDK requer Edge Functions ou Admin API. 
    // Por segurança, apenas deslogamos e orientamos o usuário.
    await doLogout();
    showToast('Para excluir permanentemente, contate o suporte.', '🗑');
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
