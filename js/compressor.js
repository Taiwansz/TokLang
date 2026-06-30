/* ===== APP: COMPRESSOR ===== */
const SYSTEM_PROMPT = `Você é o motor de compressão do TokLang. Converta prompts em linguagem natural para notação TokLang comprimida.

GRAMÁTICA TOKLANG:
Formato: AÇÃO $LANG @FRAMEWORK #ESTRUTURA; tarefa; in[params]; modificadores

AÇÕES: cr(criar) fix(debug) ex(explicar) rf(refatorar) op(otimizar) tst(testes) doc(documentar) cv(converter) rev(revisar) sum(resumir)
LINGUAGEM: $py $js $ts $sql $go $rs $sh $css $java $rb
FRAMEWORKS: @streamlit @fastapi @flask @react @next @express @pandas @plt @prisma @pg @mongo @jest
ESTRUTURA: #fn #cls #scr #api #comp #hook #mod #mw
PARÂMETROS: in[a,b,c] out[x,y] err[404,422]
MODIFICADORES: ui+(visual bonito) cm(comentários) prd(produção) min(simples) dk(exemplos) typ(tipos) async *(máxima qualidade)

REGRAS:
1. REMOVA completamente: saudações, "por favor", "obrigado", cortesias, "você pode", "seria legal", "boa tarde"
2. Identifique a ação principal
3. Identifique linguagem ($) e framework (@) se mencionados
4. Extraia parâmetros de entrada se houver
5. Mapeie requisitos em modificadores
6. Tarefa = 2-5 palavras descritivas no máximo

RETORNE APENAS a notação TokLang em uma única linha. Sem explicação, sem markdown, sem aspas.`;

const EXAMPLES = [
  "Bom dia! Por favor faça um código python que use streamlit como interface para ficar bonitinho podendo calcular a velocidade de um objeto quando eu colocar as grandezas",
  "Preciso de uma API REST completa em Node.js com Express para gerenciar usuários, com operações CRUD. Os campos são nome, email e role. Trate os erros 404 e 422. Código pronto para produção.",
  "Você pode me explicar o conceito de closures em JavaScript de forma bem didática? Seria ótimo ter exemplos práticos também",
  "Tenho essa função aqui que tá muito bagunçada: function calc(a,b,c){return a*b/c*100}. Consegue refatorar ela pra ficar mais limpa seguindo boas práticas?",
  "Cria um dashboard interativo em Python com Plotly e Streamlit mostrando gráficos de vendas mensais com filtro por região e produto. Quero que fique bem visual.",
  "Preciso de um script python que faça web scraping do site exemplo.com pegando título e preço dos produtos e salvando num CSV"
];

let sessionHistory = [];
let lastCompressedText = '';

function countTokens(t) {
  if (!t || !t.trim()) return 0;
  const words = t.trim().split(/\s+/).length;
  const puncMatches = t.match(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g);
  const puncCount = puncMatches ? puncMatches.length : 0;
  return Math.max(1, Math.round(words * 1.25 + puncCount * 0.4));
}

function clearInput() {
  const ta = document.getElementById('app-input');
  ta.value = '';
  onInputChange();
  ta.focus();
}

function onInputChange() {
  const val = document.getElementById('app-input').value;
  const len = val.length;
  const MAX = 16000;
  document.getElementById('input-tok-count').textContent = countTokens(val) + ' tokens';
  document.getElementById('char-count').textContent = len.toLocaleString('pt-BR');
  const pct = (len / MAX) * 100;
  const bar = document.getElementById('char-bar');
  if (bar) {
    bar.style.width = Math.min(pct, 100) + '%';
    bar.className = 'char-limit-fill' + (pct >= 100 ? ' over' : pct >= 85 ? ' warn' : '');
  }
}

function fillPrompt(i) {
  document.getElementById('app-input').value = EXAMPLES[i];
  onInputChange();
  document.getElementById('app-input').focus();
}

function copyOutput() {
  if (!lastCompressedText) return;
  navigator.clipboard.writeText(lastCompressedText).then(() => {
    const btn = document.getElementById('copy-output-btn');
    if (btn) { btn.classList.add('copied'); btn.innerHTML = '✓ Copiado'; }
    showToast('Resultado copiado!', '✓');
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';
      }
    }, 2000);
  }).catch(() => showToast('Erro ao copiar — use Ctrl+C', '!'));
}

function setPipeStep(step, state, value = '') {
  const dot = document.getElementById('pipe-dot-' + step);
  const lbl = document.getElementById('pipe-lbl-' + step);
  const val = document.getElementById('pipe-val-' + step);
  if (dot) dot.className = 'pipe-dot' + (state === 'done' ? ' done' : state === 'active' ? ' active' : '');
  if (lbl && state !== 'idle') lbl.classList.add('done');
  if (val && value) val.textContent = value;
}
function resetPipeline() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('pipe-dot-'+i); if (dot) dot.className = 'pipe-dot';
    const lbl = document.getElementById('pipe-lbl-'+i); if (lbl) lbl.classList.remove('done');
    const val = document.getElementById('pipe-val-'+i); if (val) val.textContent = '';
  }
  const ps = document.getElementById('pipe-status');
  if (ps) { ps.textContent = 'aguardando'; ps.className = 'pill pill-gray'; }
}

async function doCompress() {
  const input = document.getElementById('app-input').value.trim();
  if (!input) { document.getElementById('app-input').focus(); return; }
  if (input.length > 16000) { showToast('Prompt muito longo. Máximo 16.000 caracteres.', '!'); return; }

  const u = await getUser();
  if (!u) {
    const anonymousUsage = parseInt(sessionStorage.getItem('anonymous_usage') || '0', 10);
    if (anonymousUsage >= 1) {
      const modal = document.getElementById('visitor-limit-modal');
      if (modal) {
        modal.style.display = 'flex';
      } else {
        showToast('Limite de 1 compressão gratuita para visitantes atingido. Cadastre-se para continuar!', '!');
        setTimeout(() => navigate('signup'), 1500);
      }
      return;
    }
  }

  if (typeof loadActiveVocabulary === 'function') {
    await loadActiveVocabulary();
  }

  const btn      = document.getElementById('compress-btn');
  const output   = document.getElementById('app-output');
  const errorDiv = document.getElementById('app-error');
  const copyBtn  = document.getElementById('copy-output-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="blink-cursor"></span>&nbsp; Comprimindo...';
  output.innerHTML = '<span class="output-loading"><span class="blink-cursor"></span> analisando semântica...</span>';
  document.getElementById('app-stats').style.display = 'none';
  errorDiv.innerHTML = '';
  if (copyBtn) copyBtn.style.display = 'none';
  resetPipeline();

  const tokBefore = countTokens(input);
  const ps = document.getElementById('pipe-status');
  if (ps) { ps.textContent = 'processando'; ps.className = 'pill pill-amber'; }

  setPipeStep(1, 'done', tokBefore + 'tk');
  await sleep(100);
  setPipeStep(2, 'active');

  const items = document.querySelectorAll('.ss-lbl');
  if (items.length >= 4) {
    items[2].textContent = 'economia';
    items[3].textContent = '$ economizado*';
  }

  if (typeof TokLangEngine !== 'undefined') {
    const localCompressed = TokLangEngine.compressLocally(input, window.activeVocabulary);
    if (localCompressed) {
      console.log('[LOCAL COMPILER] Prompt comprimido localmente (0ms):', localCompressed);
      lastCompressedText = localCompressed;
      
      await sleep(100);
      setPipeStep(2, 'done', 'semântica mapeada (local)');
      await sleep(80);
      setPipeStep(3, 'active');
      await sleep(100);
      
      const tokAfter = countTokens(localCompressed);
      const savings  = Math.max(0, Math.round((1 - tokAfter / tokBefore) * 100));
      const usdSaved = ((tokBefore - tokAfter) * 0.003 / 1000).toFixed(5);
      
      setPipeStep(3, 'done', tokAfter + 'tk');
      await sleep(60);
      setPipeStep(4, 'done', '✓ pronto para envio');
      
      if (ps) { ps.textContent = 'concluído'; ps.className = 'pill pill-green'; }
      output.innerHTML = `<span class="output-text">${escHtml(localCompressed)}</span>`;
      document.getElementById('output-tok-count').textContent = tokAfter + ' tokens';
      if (copyBtn) copyBtn.style.display = 'flex';
      
      document.getElementById('stat-before').textContent = tokBefore;
      document.getElementById('stat-after').textContent  = tokAfter;
      document.getElementById('stat-pct').textContent    = savings + '%';
      document.getElementById('stat-usd').textContent    = '$' + usdSaved;
      document.getElementById('app-stats').style.display = 'flex';
      
      const now = new Date();
      sessionHistory.unshift({
        compressed: localCompressed, savings,
        time: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
        original: input.substring(0,60)
      });
      if (!u) {
        const usage = parseInt(sessionStorage.getItem('anonymous_usage') || '0', 10);
        sessionStorage.setItem('anonymous_usage', usage + 1);
      }
      renderHistory();
      updateUsageUI();
      
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Comprimir <span style="font-weight:300;opacity:.6;font-size:10px;margin-left:4px">Ctrl+Enter</span>`;
      return;
    }
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session && session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    const res = await fetch('/api/compress', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ prompt: input, userId: u ? u.id : null })
    });
    if (!res.ok) {
      let errMsg = 'Erro no servidor';
      try {
        const text = await res.text();
        const errData = JSON.parse(text);
        errMsg = errData.error || errMsg;
      } catch (e) {
        errMsg = `Erro no servidor (Status ${res.status})`;
      }
      throw new Error(errMsg);
    }
    const data = await res.json();
    const compressed = data.compressed;
    lastCompressedText = compressed;

    await sleep(200);
    setPipeStep(2, 'done', 'semântica mapeada');
    await sleep(200);
    setPipeStep(3, 'active');
    await sleep(280);

    const tokAfter = countTokens(compressed);
    const savings  = Math.max(0, Math.round((1 - tokAfter / tokBefore) * 100));
    const usdSaved = ((tokBefore - tokAfter) * 0.003 / 1000).toFixed(5);

    setPipeStep(3, 'done', tokAfter + 'tk');
    await sleep(180);
    setPipeStep(4, 'done', '✓ pronto para envio');

    if (ps) { ps.textContent = 'concluído'; ps.className = 'pill pill-green'; }

    output.innerHTML = `<span class="output-text">${escHtml(compressed)}</span>`;
    document.getElementById('output-tok-count').textContent = tokAfter + ' tokens';
    if (copyBtn) copyBtn.style.display = 'flex';

    document.getElementById('stat-before').textContent = tokBefore;
    document.getElementById('stat-after').textContent  = tokAfter;
    document.getElementById('stat-pct').textContent    = savings + '%';
    document.getElementById('stat-usd').textContent    = '$' + usdSaved;
    document.getElementById('app-stats').style.display = 'flex';

    let session = null;
    if (window.supabase && !window.IS_DEMO) {
      const res = await window.supabase.auth.getSession();
      session = res.data.session;
    }
    if (session && !window.IS_DEMO) {
      await window.supabase.from('history').insert({
        user_id: session.user.id,
        original_text: input,
        compressed_text: compressed,
        tokens_before: tokBefore,
        tokens_after: tokAfter,
        savings_pct: savings
      });
    }

    const now = new Date();
    sessionHistory.unshift({
      compressed, savings,
      time: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
      original: input.substring(0,60)
    });

    if (!u) {
      const usage = parseInt(sessionStorage.getItem('anonymous_usage') || '0', 10);
      sessionStorage.setItem('anonymous_usage', usage + 1);
    }
    renderHistory();
    updateUsageUI();

  } catch (err) {
    lastCompressedText = '';
    output.innerHTML = '<span class="output-placeholder">resultado aparecerá aqui...</span>';
    setPipeStep(2, 'idle');
    if (ps) { ps.textContent = 'erro'; ps.className = 'pill pill-gray'; }
    errorDiv.innerHTML = `<div class="error-banner">
      <strong>Erro:</strong> ${escHtml(err.message)}<br>
      <span style="font-size:10px;opacity:.7">Verifique sua conexão ou chaves de API.</span>
    </div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Comprimir <span style="font-weight:300;opacity:.6;font-size:10px;margin-left:4px">Ctrl+Enter</span>`;
  }
}

async function doExpand() {
  const input = document.getElementById('app-input').value.trim();
  if (!input) { document.getElementById('app-input').focus(); return; }

  if (typeof loadActiveVocabulary === 'function') {
    await loadActiveVocabulary();
  }

  const btn      = document.getElementById('expand-btn');
  const output   = document.getElementById('app-output');
  const errorDiv = document.getElementById('app-error');
  const copyBtn  = document.getElementById('copy-output-btn');

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="blink-cursor"></span>&nbsp; Expandindo...';
  output.innerHTML = '<span class="output-loading"><span class="blink-cursor"></span> processando notação TokLang...</span>';
  document.getElementById('app-stats').style.display = 'none';
  errorDiv.innerHTML = '';
  if (copyBtn) copyBtn.style.display = 'none';
  resetPipeline();

  const tokBefore = countTokens(input);
  const ps = document.getElementById('pipe-status');
  if (ps) { ps.textContent = 'processando'; ps.className = 'pill pill-amber'; }

  setPipeStep(1, 'done', tokBefore + 'tk (comprimido)');
  await sleep(100);
  setPipeStep(2, 'active');

  try {
    if (typeof TokLangEngine === 'undefined') {
      throw new Error('Mecanismo de expansão TokLang não foi carregado.');
    }
    const expanded = TokLangEngine.expand(input, window.activeVocabulary);
    if (!expanded) {
      throw new Error('Formato TokLang inválido ou vazio.');
    }

    lastCompressedText = expanded;
    await sleep(100);
    setPipeStep(2, 'done', 'estrutura mapeada');
    await sleep(80);
    setPipeStep(3, 'active');
    await sleep(100);

    const tokAfter = countTokens(expanded);
    const expansionFactor = (tokAfter / Math.max(1, tokBefore)).toFixed(1);

    setPipeStep(3, 'done', tokAfter + 'tk');
    await sleep(60);
    setPipeStep(4, 'done', '✓ expansão concluída');

    if (ps) { ps.textContent = 'concluído'; ps.className = 'pill pill-green'; }

    output.innerHTML = `<span class="output-text" style="color:var(--blue)">${escHtml(expanded)}</span>`;
    document.getElementById('output-tok-count').textContent = tokAfter + ' tokens';
    if (copyBtn) copyBtn.style.display = 'flex';

    document.getElementById('stat-before').textContent = tokBefore;
    document.getElementById('stat-after').textContent  = tokAfter;
    document.getElementById('stat-pct').textContent    = '+' + Math.round((tokAfter/Math.max(1, tokBefore)-1)*100) + '%';
    document.getElementById('stat-usd').textContent    = '×' + expansionFactor;

    const items = document.querySelectorAll('.ss-lbl');
    if (items.length >= 4) {
      items[2].textContent = 'crescimento';
      items[3].textContent = 'fator expansão';
    }
    document.getElementById('app-stats').style.display = 'flex';

  } catch (err) {
    lastCompressedText = '';
    output.innerHTML = '<span class="output-placeholder">resultado aparecerá aqui...</span>';
    setPipeStep(2, 'idle');
    if (ps) { ps.textContent = 'erro'; ps.className = 'pill pill-gray'; }
    errorDiv.innerHTML = `<div class="error-banner">
      <strong>Erro ao expandir:</strong> ${escHtml(err.message)}<br>
      <span style="font-size:10px;opacity:.7">Verifique se o prompt segue a notação TokLang (ex: ações como cr, ex, $py, @framework).</span>
    </div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function renderHistory() {
  const sec  = document.getElementById('history-section');
  const body = document.getElementById('history-body');
  if (!sec || !body) return;

  const { data: { session } } = await window.supabase.auth.getSession();
  
  if (session) {
    const { data: dbHistory, error } = await window.supabase
      .from('history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!error && dbHistory && dbHistory.length > 0) {
      sec.style.display = 'block';
      body.innerHTML = dbHistory.map(h => `
        <div class="history-item" title="${escHtml(h.original_text)}">
          <div class="hi-compressed">${escHtml(h.compressed_text)}</div>
          <div class="hi-meta">
            <span class="hi-saving">−${h.savings_pct}%</span>
            <span class="hi-time">${new Date(h.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
          </div>
        </div>`).join('');
      return;
    }
  }

  // Fallback para histórico da sessão local
  if (sessionHistory.length === 0) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = 'block';
  body.innerHTML = sessionHistory.slice(0, 8).map(h => `
    <div class="history-item" title="${escHtml(h.original)}">
      <div class="hi-compressed">${escHtml(h.compressed)}</div>
      <div class="hi-meta">
        <span class="hi-saving">−${h.savings}%</span>
        <span class="hi-time">${h.time}</span>
      </div>
    </div>`).join('');
}

window.closeVisitorModal = function() {
  const modal = document.getElementById('visitor-limit-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

/* ===== HOME INTERACTIVE PLAYGROUND DEMO ===== */
const PLAYGROUND_EXAMPLES = [
  "Bom dia! Por favor, escreva um script em Python usando Streamlit para gerar gráficos de vendas mensais com filtro por região.",
  "Olá, tudo bem? Consegue criar uma API REST em Node.js com Express para gerenciar posts de blog, com aspas em strings e comentários?",
  "Refatore a seguinte classe em TypeScript para usar async/await e tratar erros:\n```typescript\nclass DB {\n  save(data: any) {\n    return fetch('/save', { method: 'POST', body: JSON.stringify(data) });\n  }\n}\n```",
  "Explique o conceito de hooks customizados no React com um exemplo JSON formatado como este: {\"hook\": \"useAuth\", \"tipo\": \"autenticacao\"}."
];

let playgroundExampleIndex = 0;

window.fillDemoExample = function() {
  const ta = document.getElementById('demo-input-text');
  if (ta) {
    ta.value = PLAYGROUND_EXAMPLES[playgroundExampleIndex];
    playgroundExampleIndex = (playgroundExampleIndex + 1) % PLAYGROUND_EXAMPLES.length;
    window.updateDemoTokens();
  }
};

// Throttled token count update
let demoTokenTimeout;
window.updateDemoTokens = function() {
  const text = document.getElementById('demo-input-text')?.value || '';
  const model = document.getElementById('demo-model-select')?.value || 'gpt-4o';
  const displayInput = document.getElementById('demo-input-tokens');
  
  if (!displayInput) return;
  
  // Show quick estimation first
  const estimated = countTokens(text);
  displayInput.textContent = estimated + ' tokens';
  
  // Debounce API call for official count
  clearTimeout(demoTokenTimeout);
  demoTokenTimeout = setTimeout(async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, model })
      });
      if (res.ok) {
        const data = await res.json();
        displayInput.textContent = data.tokens + ' tokens (oficial)';
        displayInput.setAttribute('data-tokens', data.tokens);
      }
    } catch (e) {
      console.warn("Could not get official token count:", e);
    }
  }, 300);
};

window.runDemoCompression = async function() {
  const input = document.getElementById('demo-input-text')?.value.trim();
  if (!input) {
    document.getElementById('demo-input-text')?.focus();
    return;
  }
  
  const model = document.getElementById('demo-model-select')?.value || 'gpt-4o';
  const outputContainer = document.getElementById('demo-output-container');
  const outputTokensEl = document.getElementById('demo-output-tokens');
  const btn = document.getElementById('demo-compress-btn');
  const statsDiv = document.getElementById('demo-stats');
  
  if (!outputContainer || !btn) return;
  
  btn.disabled = true;
  const origBtnHtml = btn.innerHTML;
  btn.innerHTML = 'Processando...';
  outputContainer.innerHTML = '<span style="color: var(--muted); font-family: var(--sans);">Comprimindo...</span>';
  
  let localCompressed = '';
  if (typeof TokLangEngine !== 'undefined') {
    localCompressed = TokLangEngine.compressLocally(input, window.activeVocabulary);
  }
  
  // If local engine returns null or fails, fall back to simple compression mock
  if (!localCompressed) {
    localCompressed = 'cr $py; fallback compressed prompt; prd';
  }
  
  // Get official token count of output
  let outTokens = countTokens(localCompressed);
  try {
    const res = await fetch('/api/tokenize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: localCompressed, model })
    });
    if (res.ok) {
      const data = await res.json();
      outTokens = data.tokens;
    }
  } catch (e) {
    console.warn("Could not get output token count:", e);
  }
  
  // Get input token count
  const inTokensText = document.getElementById('demo-input-tokens')?.getAttribute('data-tokens') || document.getElementById('demo-input-tokens')?.textContent || '0';
  const inTokens = parseInt(inTokensText) || countTokens(input);
  
  const savings = Math.max(0, Math.round((1 - outTokens / Math.max(1, inTokens)) * 100));
  const usdSaved = ((inTokens - outTokens) * 0.0025 / 1000).toFixed(5);
  
  outputContainer.style.borderStyle = 'solid';
  outputContainer.style.justifyContent = 'flex-start';
  outputContainer.style.textAlign = 'left';
  outputContainer.innerHTML = `<span style="color: var(--green); white-space: pre-wrap;">${escHtml(localCompressed)}</span>`;
  
  if (outputTokensEl) {
    outputTokensEl.textContent = outTokens + ' tokens (oficial)';
  }
  
  // Show stats
  if (statsDiv) {
    statsDiv.style.display = 'flex';
    document.getElementById('demo-pct-saved').textContent = savings + '%';
    document.getElementById('demo-tokens-saved').textContent = (inTokens - outTokens);
    document.getElementById('demo-usd-saved').textContent = '$' + usdSaved;
  }
  
  btn.disabled = false;
  btn.innerHTML = origBtnHtml;
};
