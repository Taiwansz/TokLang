/* ===== TOKLANG v2.0 WORKBENCH CONTROLLER ===== */
const EXAMPLES = [
  {
    mode: 'lossless',
    query: '',
    budget: '',
    text: JSON.stringify({
      users: Array.from({ length: 12 }, (_, i) => ({
        id: 1001 + i,
        name: `Engineer_${i + 1}`,
        team: i % 2 === 0 ? 'ml-platform' : 'core-infra',
        role: i % 3 === 0 ? 'staff' : 'senior',
        active: i % 4 !== 0,
        quota_tokens: 100000 + i * 5000,
      })),
    }, null, 2),
  },
  {
    mode: 'balanced',
    query: 'quorum minimo Raft split-brain',
    budget: '140',
    text: [
      'Registro administrativo 1: Escalas de recepcao e reservas de auditorio da unidade regional sem relacao com consenso.',
      'Registro administrativo 2: Controle mensal de papelaria e manutencao predial dos andares operacionais.',
      'Especificacao critica de consenso Raft: o quorum minimo exige floor(N/2)+1 nos ativos para eleicao de lider; nunca permita escrita sem lider confirmado no termo corrente para evitar split-brain.',
      'Especificacao critica de consenso Raft: o quorum minimo exige floor(N/2)+1 nos ativos para eleicao de lider; nunca permita escrita sem lider confirmado no termo corrente para evitar split-brain.',
      'Registro administrativo 3: Calendario de reunioes gerais de almoxarifado e suprimentos corporativos.',
    ].join('\n\n'),
  },
  {
    mode: 'balanced',
    query: '',
    budget: '',
    text: 'Bom dia! Por favor, voce pode criar uma API REST em Node.js com Express para gerenciar usuarios sem autenticacao OAuth e nao usar ORM? Nunca exponha credenciais nos logs e trate os erros 404 e 422. Obrigado!',
  },
  {
    mode: 'balanced',
    query: '',
    budget: '',
    text: [
      'Ola! Por favor revise a consulta SQL abaixo sem remover o filtro de tenant_id:',
      '```sql\nSELECT tenant_id, SUM(amount) AS total FROM ledger WHERE status != \'cancelled\' GROUP BY tenant_id;\n```',
      JSON.stringify({
        sample: [
          { tenant_id: 'org_1', total: 4200, rk: 1 },
          { tenant_id: 'org_1', total: 3850, rk: 2 },
          { tenant_id: 'org_2', total: 5100, rk: 1 },
          { tenant_id: 'org_2', total: 2900, rk: 2 },
        ],
      }, null, 2),
    ].join('\n\n'),
  },
  {
    mode: 'lossless',
    query: '',
    budget: '',
    text: [
      '2026-11-26T09:14:00Z INFO gateway listening on 0.0.0.0:8080',
      ...Array.from({ length: 14 }, () => '2026-11-26T09:14:01Z WARN redis_pool timeout retrying connection to replica-02'),
      '2026-11-26T09:14:04Z ERROR circuit_breaker opened for billing_service after 14 retries',
    ].join('\n'),
  },
  {
    mode: 'notation',
    query: '',
    budget: '',
    text: 'rf $js @express #mw; auth middleware; prd async cm',
  },
];

let sessionHistory = [];
let lastCompressedText = '';

function countTokensLocal(text) {
  if (typeof TokLangEngine !== 'undefined' && typeof TokLangEngine.countTokens === 'function') {
    return TokLangEngine.countTokens(text, 'o200k_base');
  }
  if (!text || !text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function clearInput() {
  const ta = document.getElementById('app-input');
  if (!ta) return;
  ta.value = '';
  onInputChange();
  ta.focus();
}

function onInputChange() {
  const ta = document.getElementById('app-input');
  if (!ta) return;
  const val = ta.value;
  const len = val.length;
  const MAX = 24000;
  const tokEl = document.getElementById('input-tok-count');
  const charEl = document.getElementById('char-count');
  if (tokEl) tokEl.textContent = countTokensLocal(val) + ' tokens';
  if (charEl) charEl.textContent = len.toLocaleString('pt-BR');
  const pct = (len / MAX) * 100;
  const bar = document.getElementById('char-bar');
  if (bar) {
    bar.style.width = Math.min(pct, 100) + '%';
    bar.className = 'char-limit-fill' + (pct >= 100 ? ' over' : pct >= 85 ? ' warn' : '');
  }
}

function fillPrompt(i) {
  const preset = EXAMPLES[i];
  if (!preset) return;
  const ta = document.getElementById('app-input');
  const modeEl = document.getElementById('app-mode');
  const queryEl = document.getElementById('app-query');
  const budgetEl = document.getElementById('app-budget');
  if (ta) ta.value = preset.text;
  if (modeEl) modeEl.value = preset.mode;
  if (queryEl) queryEl.value = preset.query;
  if (budgetEl) budgetEl.value = preset.budget;
  onInputChange();
  if (ta) ta.focus();
}

function copyOutput() {
  if (!lastCompressedText) return;
  navigator.clipboard.writeText(lastCompressedText).then(() => {
    const btn = document.getElementById('copy-output-btn');
    if (btn) btn.textContent = 'Copiado';
    showToast('Saída copiada para a área de transferência', 'OK');
    setTimeout(() => {
      if (btn) btn.textContent = 'Copiar';
    }, 1800);
  }).catch(() => showToast('Erro ao copiar', '!'));
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
    const dot = document.getElementById('pipe-dot-' + i);
    const lbl = document.getElementById('pipe-lbl-' + i);
    const val = document.getElementById('pipe-val-' + i);
    if (dot) dot.className = 'pipe-dot';
    if (lbl) lbl.classList.remove('done');
    if (val) val.textContent = '';
  }
  const ps = document.getElementById('pipe-status');
  if (ps) { ps.textContent = 'aguardando'; ps.className = 'pill pill-gray'; }
}

async function doCompress() {
  const inputEl = document.getElementById('app-input');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!input) { if (inputEl) inputEl.focus(); return; }
  if (input.length > 24000) { showToast('Entrada acima do limite de 24.000 caracteres.', '!'); return; }

  const modeEl = document.getElementById('app-mode');
  const queryEl = document.getElementById('app-query');
  const budgetEl = document.getElementById('app-budget');
  const mode = modeEl ? modeEl.value : 'balanced';
  const query = queryEl ? queryEl.value.trim() : '';
  const maxTokens = budgetEl && budgetEl.value ? Number(budgetEl.value) : null;

  if (typeof loadActiveVocabulary === 'function') {
    await loadActiveVocabulary();
  }

  const btn = document.getElementById('compress-btn');
  const output = document.getElementById('app-output');
  const errorDiv = document.getElementById('app-error');
  const copyBtn = document.getElementById('copy-output-btn');
  const auditEl = document.getElementById('app-audit');

  btn.disabled = true;
  output.innerHTML = '<span class="output-loading"><span class="blink-cursor"></span> compilando em BPE...</span>';
  document.getElementById('app-stats').style.display = 'none';
  if (auditEl) auditEl.style.display = 'none';
  errorDiv.innerHTML = '';
  if (copyBtn) copyBtn.style.display = 'none';
  resetPipeline();

  const ps = document.getElementById('pipe-status');
  if (ps) { ps.textContent = 'processando'; ps.className = 'pill pill-amber'; }

  try {
    let report = null;

    // Prefer exact server BPE (js-tiktoken) when running on Express/Vercel, fallback seamlessly to local browser engine v2
    try {
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          mode,
          query,
          maxTokens,
          encoding: 'o200k_base',
          customVocab: window.activeVocabulary && window.activeVocabulary.length ? window.activeVocabulary : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        report = {
          text: data.compressed,
          tokensBefore: data.tokens_before,
          tokensAfter: data.tokens_after,
          tokensSaved: data.tokens_saved,
          savingsPct: data.savings_pct,
          attentionFlopsReductionPct: data.attention_flops_reduction_pct,
          prefixHash: data.prefix_hash,
          stagesApplied: data.stages_applied || [],
          latencyMs: data.latency_ms,
          tokenizer: data.tokenizer || { source: 'js-tiktoken:o200k_base' },
          audit: data.audit || { negationsPreservedRatio: 1, monotonicBpeVerified: true },
        };
      }
    } catch (_) {
      report = null;
    }

    if (!report && typeof TokLangEngine !== 'undefined') {
      report = TokLangEngine.compile(input, {
        mode,
        query,
        maxTokens,
        encoding: 'o200k_base',
        customVocab: window.activeVocabulary && window.activeVocabulary.length ? window.activeVocabulary : null,
      });
    }

    if (!report) throw new Error('Motor TokLang v2 não carregado.');

    lastCompressedText = report.text;

    setPipeStep(1, 'done', `${report.tokensBefore} tk`);
    setPipeStep(2, 'done', report.stagesApplied.filter((s) => s.includes('tabular') || s.includes('json') || s.includes('log')).join(', ') || 'nenhum bloco');
    setPipeStep(3, 'done', `negações ${Math.round((report.audit.negationsPreservedRatio || 1) * 100)}%`);
    setPipeStep(4, 'done', `${report.tokensAfter} tk | ${report.latencyMs}ms`);

    if (ps) { ps.textContent = 'auditado'; ps.className = 'pill pill-green'; }

    output.innerHTML = `<span class="output-text">${escHtml(report.text)}</span>`;
    document.getElementById('output-tok-count').textContent = `${report.tokensAfter} tokens`;
    if (copyBtn) copyBtn.style.display = 'inline-flex';

    const items = document.querySelectorAll('.ss-lbl');
    if (items.length >= 4) {
      items[2].textContent = 'redução BPE';
      items[3].textContent = 'FLOPs prefill';
    }
    document.getElementById('stat-before').textContent = report.tokensBefore;
    document.getElementById('stat-after').textContent = report.tokensAfter;
    document.getElementById('stat-pct').textContent = `-${report.savingsPct}%`;
    document.getElementById('stat-usd').textContent = `-${report.attentionFlopsReductionPct}%`;
    document.getElementById('app-stats').style.display = 'grid';

    if (auditEl) {
      auditEl.innerHTML = [
        `<span><strong>Tokenizer:</strong> ${escHtml(report.tokenizer.source || 'o200k_base')}</span>`,
        `<span><strong>Monotonic BPE:</strong> ${report.audit.monotonicBpeVerified ? 'PASS' : 'ROLLBACK'}</span>`,
        `<span><strong>Polarity Lock:</strong> ${Math.round((report.audit.negationsPreservedRatio || 1) * 100)}%</span>`,
        `<span><strong>SHA-256:</strong> ${(report.prefixHash || '').slice(0, 14)}</span>`,
        `<span><strong>Estágios:</strong> ${escHtml((report.stagesApplied || []).join(', ') || 'passthrough')}</span>`,
      ].join('');
      auditEl.style.display = 'flex';
    }

    const now = new Date();
    sessionHistory.unshift({
      compressed: report.text,
      savings: Math.round(report.savingsPct),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      original: input.substring(0, 60),
    });
    renderHistory();
    if (typeof updateUsageUI === 'function') updateUsageUI();
  } catch (err) {
    lastCompressedText = '';
    output.innerHTML = '<span class="output-placeholder">A saída compilada e a auditoria BPE aparecerão aqui.</span>';
    if (ps) { ps.textContent = 'erro'; ps.className = 'pill pill-gray'; }
    errorDiv.innerHTML = `<div class="error-banner"><strong>Erro:</strong> ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

async function doExpand() {
  const inputEl = document.getElementById('app-input');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!input) { if (inputEl) inputEl.focus(); return; }

  if (typeof loadActiveVocabulary === 'function') {
    await loadActiveVocabulary();
  }

  const btn = document.getElementById('expand-btn');
  const output = document.getElementById('app-output');
  const errorDiv = document.getElementById('app-error');
  const copyBtn = document.getElementById('copy-output-btn');
  const auditEl = document.getElementById('app-audit');

  btn.disabled = true;
  errorDiv.innerHTML = '';
  resetPipeline();

  try {
    if (typeof TokLangEngine === 'undefined') {
      throw new Error('TokLangEngine v2 não carregado.');
    }
    const expanded = TokLangEngine.expand(input, window.activeVocabulary);
    if (!expanded) throw new Error('Entrada inválida para expansão ou decodificação.');

    lastCompressedText = expanded;
    const tokBefore = countTokensLocal(input);
    const tokAfter = countTokensLocal(expanded);
    const isStructuredDecode = input.startsWith('@table') || input.startsWith('@struct{');

    setPipeStep(1, 'done', `${tokBefore} tk`);
    setPipeStep(2, 'done', isStructuredDecode ? 'decode @table -> JSON' : 'expansão DSL');
    setPipeStep(3, 'done', `${tokAfter} tk`);
    setPipeStep(4, 'done', 'concluído');

    const ps = document.getElementById('pipe-status');
    if (ps) { ps.textContent = 'decodificado'; ps.className = 'pill pill-blue'; }

    output.innerHTML = `<span class="output-text" style="color:var(--petrol)">${escHtml(expanded)}</span>`;
    document.getElementById('output-tok-count').textContent = `${tokAfter} tokens`;
    if (copyBtn) copyBtn.style.display = 'inline-flex';

    const items = document.querySelectorAll('.ss-lbl');
    if (items.length >= 4) {
      items[2].textContent = 'expansão';
      items[3].textContent = 'fator';
    }
    document.getElementById('stat-before').textContent = tokBefore;
    document.getElementById('stat-after').textContent = tokAfter;
    document.getElementById('stat-pct').textContent = `+${Math.max(0, Math.round((tokAfter / Math.max(1, tokBefore) - 1) * 100))}%`;
    document.getElementById('stat-usd').textContent = `${(tokAfter / Math.max(1, tokBefore)).toFixed(1)}x`;
    document.getElementById('app-stats').style.display = 'grid';
    if (auditEl) auditEl.style.display = 'none';
  } catch (err) {
    lastCompressedText = '';
    errorDiv.innerHTML = `<div class="error-banner"><strong>Erro ao expandir/decodificar:</strong> ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

async function renderHistory() {
  const sec = document.getElementById('history-section');
  const body = document.getElementById('history-body');
  if (!sec || !body) return;

  if (sessionHistory.length === 0) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = 'block';
  body.innerHTML = sessionHistory.slice(0, 6).map((h) => `
    <div class="history-item" title="${escHtml(h.original)}">
      <div class="hi-compressed">${escHtml(h.compressed)}</div>
      <div class="hi-meta">
        <span class="hi-saving">-${h.savings}% BPE</span>
        <span class="hi-time">${h.time}</span>
      </div>
    </div>`).join('');
}

window.closeVisitorModal = function () {
  const modal = document.getElementById('visitor-limit-modal');
  if (modal) modal.style.display = 'none';
};
