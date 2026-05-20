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

function countTokens(t) { return t.trim() ? t.trim().split(/\s+/).length : 0; }

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
    showToast('Resultado copiado!', '📋');
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';
      }
    }, 2000);
  }).catch(() => showToast('Erro ao copiar — use Ctrl+C', '⚠'));
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
  if (input.length > 16000) { showToast('Prompt muito longo. Máximo 16.000 caracteres.', '⚠'); return; }

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
  await sleep(280);
  setPipeStep(2, 'active');

  try {
    const res = await fetch('/api/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erro no servidor');
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

    // 1. Salvar no Supabase (se logado)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('history').insert({
        user_id: session.user.id,
        original_text: input,
        compressed_text: compressed,
        tokens_before: tokBefore,
        tokens_after: tokAfter,
        savings_pct: savings
      });
    }

    // 2. Fallback local para a sessão atual (opcional)
    const now = new Date();
    sessionHistory.unshift({
      compressed, savings,
      time: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
      original: input.substring(0,60)
    });

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
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Comprimir <span style="font-weight:300;opacity:.6;font-size:10px">Ctrl+Enter</span>`;
  }
}

async function renderHistory() {
  const sec  = document.getElementById('history-section');
  const body = document.getElementById('history-body');
  if (!sec || !body) return;

  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    const { data: dbHistory, error } = await supabase
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
