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

window.activeVocabulary = [];

async function loadActiveVocabulary() {
  const u = await getUser();
  if (!u) {
    window.activeVocabulary = [];
    return;
  }
  
  if (window.supabase && !window.IS_DEMO) {
    try {
      const { data, error } = await window.supabase
        .from('vocabulary')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        window.activeVocabulary = data;
      }
    } catch(e) {
      console.warn("Supabase vocab fetch failed", e);
    }
  } else {
    try {
      const res = await fetch('/api/vocabulary?userId=' + u.id);
      if (res.ok) {
        window.activeVocabulary = await res.json();
      }
    } catch(e) {
      console.warn("Local vocab fetch failed", e);
    }
  }
}

async function renderVocabulary() {
  await loadActiveVocabulary();
  const listEl = document.getElementById('vocab-list');
  if (!listEl) return;
  
  if (window.activeVocabulary.length === 0) {
    listEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; border: 1px dashed var(--border); border-radius: var(--radius); color: var(--muted); font-family: var(--mono); font-size: 12px;">
        Nenhum termo customizado cadastrado ainda. Use o formulário acima para adicionar!
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = window.activeVocabulary.map(v => `
    <div class="vocab-card" id="vocab-card-${v.id}">
      <div class="vocab-card-header">
        <span class="vocab-card-term">${escHtml(v.term)}</span>
        <div class="vocab-card-actions">
          <button class="vocab-action-btn" onclick="editVocab('${v.id}')" title="Editar termo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="vocab-action-btn delete" onclick="deleteVocab('${v.id}')" title="Excluir termo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
      <div class="vocab-card-def">${escHtml(v.definition)}</div>
      <div class="vocab-card-date">Criado em: ${new Date(v.created_at).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('');
}

async function handleSaveVocab(e) {
  e.preventDefault();
  const u = await getUser();
  if (!u) return;
  
  const id = document.getElementById('vocab-id').value;
  const term = document.getElementById('vocab-term').value.trim();
  const definition = document.getElementById('vocab-def').value.trim();
  
  if (!term || !definition) {
    showToast('Termo e definição são obrigatórios', '!');
    return;
  }
  
  const submitBtn = document.getElementById('vocab-submit-btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';
  
  try {
    let success = false;
    let errorMsg = '';
    
    if (window.supabase && !window.IS_DEMO) {
      if (id) {
        const { error } = await window.supabase
          .from('vocabulary')
          .update({ term, definition })
          .eq('id', id);
        success = !error;
        if (error) errorMsg = error.message;
      } else {
        const { error } = await window.supabase
          .from('vocabulary')
          .insert({ term, definition, user_id: u.id });
        success = !error;
        if (error) errorMsg = error.message;
      }
    } else {
      if (id) {
        const oldTermObj = window.activeVocabulary.find(v => v.id === id);
        if (oldTermObj && oldTermObj.term !== term) {
          await fetch('/api/vocabulary/' + id, { method: 'DELETE' });
        }
      }
      
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, definition, userId: u.id })
      });
      success = res.ok;
      if (!res.ok) {
        const errJson = await res.json();
        errorMsg = errJson.error;
      }
    }
    
    if (success) {
      showToast(id ? 'Termo atualizado com sucesso!' : 'Termo adicionado com sucesso!', '✓');
      clearVocabForm();
      await renderVocabulary();
    } else {
      showToast('Erro ao salvar termo: ' + errorMsg, '!');
    }
  } catch(err) {
    console.error('Save vocab error:', err);
    showToast('Erro ao salvar termo', '!');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function editVocab(id) {
  const item = window.activeVocabulary.find(v => v.id === id);
  if (!item) return;
  
  document.getElementById('vocab-id').value = item.id;
  document.getElementById('vocab-term').value = item.term;
  document.getElementById('vocab-def').value = item.definition;
  
  document.getElementById('vocab-form-title').textContent = 'Editar termo';
  document.getElementById('vocab-submit-btn').textContent = 'Atualizar Termo →';
  document.getElementById('vocab-cancel-btn').style.display = 'inline-block';
  
  document.getElementById('vocab-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearVocabForm() {
  document.getElementById('vocab-id').value = '';
  document.getElementById('vocab-term').value = '';
  document.getElementById('vocab-def').value = '';
  
  document.getElementById('vocab-form-title').textContent = 'Adicionar novo termo';
  document.getElementById('vocab-submit-btn').textContent = 'Salvar Termo →';
  document.getElementById('vocab-cancel-btn').style.display = 'none';
}

async function deleteVocab(id) {
  if (!confirm('Deseja realmente excluir este termo do seu vocabulário?')) return;
  
  const cardEl = document.getElementById('vocab-card-' + id);
  if (cardEl) {
    cardEl.style.transition = 'all 0.3s ease';
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'scale(0.9)';
  }
  
  try {
    let success = false;
    let errorMsg = '';
    
    if (window.supabase && !window.IS_DEMO) {
      const { error } = await window.supabase
        .from('vocabulary')
        .delete()
        .eq('id', id);
      success = !error;
      if (error) errorMsg = error.message;
    } else {
      const res = await fetch('/api/vocabulary/' + id, { method: 'DELETE' });
      success = res.ok;
      if (!res.ok) {
        const errJson = await res.json();
        errorMsg = errJson.error;
      }
    }
    
    if (success) {
      showToast('Termo excluído!', '✓');
      await renderVocabulary();
    } else {
      showToast('Erro ao excluir termo: ' + errorMsg, '!');
      if (cardEl) {
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'none';
      }
    }
  } catch(err) {
    console.error('Delete vocab error:', err);
    showToast('Erro ao excluir termo', '!');
    if (cardEl) {
      cardEl.style.opacity = '1';
      cardEl.style.transform = 'none';
    }
  }
}

async function initDashboard() {
  const u = await getUser();
  if (!u) { navigate('login'); return; }

  const tbody = document.getElementById('dash-recent-tbody');
  const fh = document.getElementById('dash-full-history');

  // Fetch real data from Supabase
  let dbHistory = null, error = null, count = 0;
  if (window.supabase && !window.IS_DEMO) { // Prevent hitting unconfigured generic db
    try {
      const res = await window.supabase.from('history').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      dbHistory = res.data; error = res.error; count = res.count;
    } catch(e) { console.warn("Supabase fetch failed", e); }
  } else {
    dbHistory = FAKE_HISTORY.map((h, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(idx / 1.2));
      return { 
        original_text: h.orig, 
        compressed_text: h.tok, 
        savings_pct: h.saving, 
        created_at: d.toISOString(), 
        tokens_before: h.before, 
        tokens_after: h.after 
      };
    });
    count = dbHistory.length;
  }

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
  const totalTokensSaved = dbHistory ? dbHistory.reduce((acc, curr) => acc + Math.max(0, curr.tokens_before - curr.tokens_after), 0) : 0;
  
  const formatTokens = (v) => {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toString();
  };

  const avgSavingsPct = totalUsed > 0 ? (dbHistory.reduce((acc, curr) => acc + curr.savings_pct, 0) / totalUsed).toFixed(0) : '0';

  document.querySelectorAll('#dash-overview .metric-val').forEach((el, i) => {
    if (i === 0) el.textContent = totalUsed;
    if (i === 1) el.textContent = formatTokens(totalTokensSaved);
    if (i === 2) el.textContent = avgSavingsPct + '%';
    if (i === 3) el.textContent = Math.max(0, 500 - totalUsed);
  });
  
  const deltaElements = document.querySelectorAll('#dash-overview .metric-delta');
  if (deltaElements.length >= 2) {
    deltaElements[1].innerHTML = `↑ ${avgSavingsPct}% média`;
  }
  if (deltaElements.length >= 4) {
    deltaElements[3].textContent = `restantes de 500`;
  }

  const usageFill = document.querySelector('#dash-overview .usage-bar-fill');
  if (usageFill) usageFill.style.width = Math.min(100, (totalUsed/500)*100).toFixed(1) + '%';
  const usageLabel = document.querySelector('#dash-overview .usage-bar-label span:last-child');
  if (usageLabel) usageLabel.textContent = totalUsed + ' / 500 compressões';

  // Group by day for the last 7 days to draw SVG charts
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    last7Days.push({
      date: d,
      dateString: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      compressions: 0,
      tokensSaved: 0
    });
  }

  if (dbHistory) {
    dbHistory.forEach(item => {
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0,0,0,0);
      const dayMatch = last7Days.find(d => d.date.getTime() === itemDate.getTime());
      if (dayMatch) {
        dayMatch.compressions += 1;
        const saved = (item.tokens_before || 0) - (item.tokens_after || 0);
        dayMatch.tokensSaved += Math.max(0, saved);
      }
    });
  }

  const tokensSavedTrend = last7Days.map(d => d.tokensSaved);
  const compressionsTrend = last7Days.map(d => d.compressions);

  buildSvgChart('mini-chart-1', tokensSavedTrend, '');
  buildSvgChart('mini-chart-2', compressionsTrend, '');

  if (u.apiKey) {
    const el = document.getElementById('api-key-display');
    const el2 = document.getElementById('api-key-code');
    if (el) el.textContent = u.apiKey.substring(0,8) + '••••••••••••••••••••••';
    if (el2) el2.textContent = u.apiKey.substring(0,12) + '...';
  }

  // Load vocabulary
  await loadActiveVocabulary();

  // Sync user info
  syncDashUser(u);
}

function buildSvgChart(id, data, labelPrefix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  
  const max = Math.max(...data, 1);
  const width = 300;
  const height = 80;
  const padding = 10;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((v / max) * (height - 2 * padding));
    return { x, y, val: v };
  });
  
  let lineD = '';
  let areaD = '';
  
  if (points.length > 0) {
    lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      lineD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    areaD = `${lineD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  }
  
  const gradientId = `grad-${id}`;
  const svg = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" style="overflow: visible;">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--green)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--green)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#${gradientId})" style="transition: all 0.3s ease;" />
      <path d="${lineD}" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: all 0.3s ease;" />
      ${points.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--bg2)" stroke="var(--green)" stroke-width="2" class="chart-dot" data-val="${p.val}">
          <title>${labelPrefix}${p.val}</title>
        </circle>
      `).join('')}
    </svg>
  `;
  el.innerHTML = svg;
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
  
  if (name === 'vocabulary') {
    renderVocabulary();
  }

  // Update mobile header title
  const titles = { overview:'Visão geral', history:'Histórico', vocabulary:'Vocabulário', api:'API & SDK', settings:'Configurações', billing:'Plano & cobrança' };
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
  showToast('Chave de API copiada!', '✓');
}

async function rotateApiKey() {
  if (!confirm('Tem certeza? A chave atual será invalidada imediatamente.')) return;
  const u = await getUser(); if (!u) return;
  const newKey = 'tl_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  

  let error = null;
  if (window.supabase && !window.IS_DEMO) {
    const res = await window.supabase.auth.updateUser({
      data: { apiKey: newKey }
    });
    error = res.error;

    if (!error && u.id) {
      const { error: profileError } = await window.supabase
        .from('profiles')
        .update({ api_key: newKey })
        .eq('id', u.id);
      if (profileError) {
        console.error('Erro ao atualizar a chave de API na tabela profiles:', profileError);
      }
    }
  } else {
    let mock = JSON.parse(sessionStorage.getItem('mock_user') || '{}');
    mock.apiKey = newKey;
    sessionStorage.setItem('mock_user', JSON.stringify(mock));
  }

  if (error) {
    showToast('Erro ao rotacionar chave: ' + error.message, '!');
    return;
  }

  u.apiKey = newKey;
  apiRevealed = false;
  document.getElementById('api-key-display').textContent = newKey.substring(0,8) + '••••••••••••••••••••••';
  showToast('Chave de API rotacionada!', '✓');
}

async function editName() {
  const u = await getUser(); if (!u) return;
  const n = prompt('Novo nome:', u.name);
  if (n?.trim()) {

  let error = null;
  if (window.supabase && !window.IS_DEMO) {
    const res = await window.supabase.auth.updateUser({

      data: { name: n.trim() }
    });
    error = res.error;
  } else {
    let mock = JSON.parse(sessionStorage.getItem('mock_user') || '{}');
    mock.name = n.trim();
    sessionStorage.setItem('mock_user', JSON.stringify(mock));
  }
    if (error) {
      showToast('Erro ao atualizar nome: ' + error.message, '!');
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
    showToast('Para excluir permanentemente, contate o suporte.', '!');
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
