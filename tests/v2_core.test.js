/**
 * TokLang v2.0 Core Engine - TDD Specification Suite
 * Tests real BPE tokenization, lossless structural codec (TOON/tabular),
 * negation/polarity lock, extractive query-aware compression,
 * BPE monotonicity guard, CAPC cache stability, and notation compatibility.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { getEncoding } = require('js-tiktoken');

const TokLangEngine = require('../js/toklang-engine.js');

const o200k = getEncoding('o200k_base');
const cl100k = getEncoding('cl100k_base');

test('v2 API surface exposes version, countTokens, compile, compileMessages, encodeStructured, decodeStructured', () => {
  assert.equal(typeof TokLangEngine.VERSION, 'string');
  assert.ok(TokLangEngine.VERSION.startsWith('2.'));
  assert.equal(typeof TokLangEngine.countTokens, 'function');
  assert.equal(typeof TokLangEngine.compile, 'function');
  assert.equal(typeof TokLangEngine.compileMessages, 'function');
  assert.equal(typeof TokLangEngine.encodeStructured, 'function');
  assert.equal(typeof TokLangEngine.decodeStructured, 'function');
});

test('Real BPE tokenization matches js-tiktoken o200k_base and cl100k_base exactly in Node', () => {
  const sample = 'Crie uma API REST em PostgreSQL sem autenticacao JWT e nao use ORM. {"id": 42, "status": "ok"}';
  assert.equal(TokLangEngine.countTokens(sample, 'o200k_base'), o200k.encode(sample).length);
  assert.equal(TokLangEngine.countTokens(sample, 'cl100k_base'), cl100k.encode(sample).length);
  assert.equal(TokLangEngine.countTokens('', 'o200k_base'), 0);
});

test('Banishment of consonant skeleton mutations across all modes', () => {
  const prompt = 'Bom dia! Por favor crie um script Python com Streamlit para calcular a velocidade media e a aceleracao de um veiculo com autenticacao segura.';
  for (const mode of ['lossless', 'balanced', 'aggressive', 'notation']) {
    const res = TokLangEngine.compile(prompt, { mode });
    assert.ok(!res.text.includes('vlcdd'), `Consonant skeleton leaked in mode ${mode}: ${res.text}`);
    assert.ok(!res.text.includes('aclr'), `Consonant skeleton leaked in mode ${mode}: ${res.text}`);
    assert.ok(!res.text.includes('atntc'), `Consonant skeleton leaked in mode ${mode}: ${res.text}`);
    assert.ok(res.tokensAfter <= res.tokensBefore, `Monotonicity violated in mode ${mode}`);
  }
});

test('Polarity and Negation Lock preserves 100% of PT-BR and EN negations and constraints', () => {
  const promptPt = 'Ola, boa tarde! Por favor, crie uma API REST em Node.js sem autenticacao OAuth, nao use ORM, nunca exponha credenciais no log e jamais altere a tabela users.';
  const promptEn = 'Hello! Please refactor this service. Do not mutate global state, never log secrets, without external dependencies, and only return active records.';

  for (const mode of ['lossless', 'balanced', 'aggressive']) {
    const resPt = TokLangEngine.compile(promptPt, { mode });
    const lowerPt = resPt.text.toLowerCase();
    assert.ok(lowerPt.includes('sem'), `Lost "sem" in ${mode}: ${resPt.text}`);
    assert.ok(lowerPt.includes('nao') || lowerPt.includes('não'), `Lost "nao" in ${mode}: ${resPt.text}`);
    assert.ok(lowerPt.includes('nunca'), `Lost "nunca" in ${mode}: ${resPt.text}`);
    assert.ok(lowerPt.includes('jamais'), `Lost "jamais" in ${mode}: ${resPt.text}`);
    assert.equal(resPt.audit.negationsPreservedRatio, 1);

    const resEn = TokLangEngine.compile(promptEn, { mode });
    const lowerEn = resEn.text.toLowerCase();
    assert.ok(lowerEn.includes('not'), `Lost "not" in ${mode}: ${resEn.text}`);
    assert.ok(lowerEn.includes('never'), `Lost "never" in ${mode}: ${resEn.text}`);
    assert.ok(lowerEn.includes('without'), `Lost "without" in ${mode}: ${resEn.text}`);
    assert.ok(lowerEn.includes('only'), `Lost "only" in ${mode}: ${resEn.text}`);
    assert.equal(resEn.audit.negationsPreservedRatio, 1);
  }
});

test('Lossless structural tabular codec (TOON/schema-hoisting) cuts >=35% real BPE tokens and roundtrips bit-for-bit', () => {
  const payload = {
    users: Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      name: `Engineer_${i + 1}`,
      department: i % 2 === 0 ? 'platform' : 'ml-infra',
      role: i % 3 === 0 ? 'staff' : 'senior',
      active: i % 4 !== 0,
      quota_tokens: 100000 + i * 5000,
    })),
  };

  const rawJson = JSON.stringify(payload, null, 2);
  const rawTokens = o200k.encode(rawJson).length;
  const encoded = TokLangEngine.encodeStructured(payload);
  const encodedTokens = o200k.encode(encoded).length;

  const savingsPct = ((rawTokens - encodedTokens) / rawTokens) * 100;
  assert.ok(savingsPct >= 35, `Expected >=35% real BPE reduction on uniform JSON, got ${savingsPct.toFixed(1)}%`);

  const decoded = TokLangEngine.decodeStructured(encoded);
  assert.deepEqual(decoded, payload);
});

test('Mixed prompt preserves code blocks verbatim while compressing embedded JSON payload', () => {
  const records = Array.from({ length: 10 }, (_, i) => ({
    order_id: 1000 + i,
    customer: `Cliente_${i}`,
    status: i % 2 === 0 ? 'paid' : 'pending',
    total_brl: 150.5 + i * 10,
  }));
  const prompt = [
    'Bom dia! Por favor analise os pedidos abaixo e nao altere a assinatura da funcao:',
    '```python',
    'def compute_revenue(orders: list[dict]) -> float:',
    '    return sum(o["total_brl"] for o in orders if o["status"] == "paid")',
    '```',
    'Payload retornado pela ferramenta:',
    JSON.stringify({ orders: records }, null, 2),
  ].join('\n\n');

  const res = TokLangEngine.compile(prompt, { mode: 'balanced' });
  assert.ok(res.text.includes('def compute_revenue(orders: list[dict]) -> float:'));
  assert.ok(res.text.includes('return sum(o["total_brl"] for o in orders if o["status"] == "paid")'));
  assert.ok(res.text.toLowerCase().includes('nao') || res.text.toLowerCase().includes('não'));
  assert.ok(res.tokensAfter < res.tokensBefore * 0.72, `Expected >28% BPE savings, got ${res.savingsPct}%`);
  assert.ok(res.stagesApplied.includes('structural_tabular'));
});

test('Repetitive log compaction folds identical consecutive entries with count marker', () => {
  const lines = [
    '2026-11-26T10:00:01Z INFO worker connected to postgres primary',
    ...Array.from({ length: 18 }, () => '2026-11-26T10:00:02Z WARN cache miss on key user_profile_v2 retrying'),
    '2026-11-26T10:00:05Z ERROR timeout after 3000ms on shard_04',
  ];
  const raw = lines.join('\n');
  const res = TokLangEngine.compile(raw, { mode: 'lossless' });
  assert.ok(res.text.includes('[x18]'));
  assert.ok(res.text.includes('ERROR timeout after 3000ms on shard_04'));
  assert.ok(res.tokensAfter < res.tokensBefore * 0.45);
});

test('Long RAG context (>2500 chars) compiles offline under hard maxTokens budget without returning null', () => {
  const noiseParagraphs = Array.from({ length: 12 }, (_, i) =>
    `Documento auxiliar ${i + 1}: O historico administrativo da filial regional descreve rotinas gerais de almoxarifado, controle de papelaria e agendamento de salas de reuniao sem impacto na arquitetura distribuida.`
  );
  const criticalParagraph = 'Especificacao critica de consenso Raft: o quorum minimo exige floor(N/2)+1 nos ativos; nunca permita escrita sem lider eleito no termo vigente para evitar split-brain.';
  const duplicateCritical = 'Especificacao critica de consenso Raft: o quorum minimo exige floor(N/2)+1 nos ativos; nunca permita escrita sem lider eleito no termo vigente para evitar split-brain.';

  const longRag = [
    ...noiseParagraphs.slice(0, 6),
    criticalParagraph,
    duplicateCritical,
    ...noiseParagraphs.slice(6),
  ].join('\n\n');

  assert.ok(longRag.length > 2200);
  const res = TokLangEngine.compile(longRag, {
    mode: 'balanced',
    query: 'como evitar split-brain e qual o quorum minimo no Raft',
    maxTokens: 140,
  });

  assert.ok(res.text.length > 0);
  assert.ok(res.tokensAfter <= 140, `Expected <=140 tokens, got ${res.tokensAfter}`);
  assert.ok(res.text.includes('floor(N/2)+1'), 'Critical Raft quorum evidence dropped');
  assert.ok(res.text.toLowerCase().includes('nunca'), 'Negation inside critical evidence dropped');
  assert.ok(res.latencyMs < 50, `Expected fast offline compilation, got ${res.latencyMs}ms`);
});

test('BPE Monotonicity Guard guarantees tokensAfter <= tokensBefore even for minimal/incompressible inputs', () => {
  const tinyInputs = [
    'Fix bug 42',
    'x=1',
    'SELECT id FROM users WHERE active = true;',
    '{"a":1}',
  ];
  for (const input of tinyInputs) {
    const res = TokLangEngine.compile(input, { mode: 'aggressive' });
    assert.ok(
      res.tokensAfter <= res.tokensBefore,
      `Monotonicity failed for "${input}": ${res.tokensBefore} -> ${res.tokensAfter}`
    );
  }
});

test('CAPC compileMessages preserves deterministic static prefixHash across different queries and computes cache economics', () => {
  const longSystem = [
    'Voce e um engenheiro especialista em bancos de dados PostgreSQL, Row Level Security e arquitetura multi-tenant.',
    ...Array.from({ length: 45 }, (_, i) =>
      `Regra operacional ${i + 1}: Todas as consultas na tabela tenant_ledger_${i + 1} devem filtrar explicitamente por organization_id usando politicas RLS auditaveis e nunca expor dados entre clientes.`
    ),
  ].join('\n');

  const sharedToolPayload = JSON.stringify({
    rows: Array.from({ length: 12 }, (_, i) => ({
      tenant_id: `org_${i + 1}`,
      table_name: `ledger_${i + 1}`,
      rls_enabled: true,
      policy_count: 3,
    })),
  }, null, 2);

  const turn1 = TokLangEngine.compileMessages(
    [
      { role: 'system', content: longSystem },
      { role: 'user', content: `Por favor verifique se existe algum tenant sem RLS no payload:\n${sharedToolPayload}` },
    ],
    { provider: 'anthropic', mode: 'balanced' }
  );

  const turn2 = TokLangEngine.compileMessages(
    [
      { role: 'system', content: longSystem },
      { role: 'user', content: 'Explique a politica de isolamento da tabela tenant_ledger_12 e nunca omita organization_id.' },
    ],
    { provider: 'anthropic', mode: 'balanced' }
  );

  assert.equal(turn1.cache.prefixHash, turn2.cache.prefixHash, 'Static prefix hash drifted between queries!');
  assert.equal(turn1.cache.prefixHash.length, 64, 'Expected SHA-256 hex prefix hash');
  assert.equal(turn1.cache.eligible, true, 'Expected system prompt >= 1024 tokens to be cache-eligible');
  assert.deepEqual(turn1.messages[0].cache_control, { type: 'ephemeral' });
  assert.ok(turn1.metrics.totalTokensAfter < turn1.metrics.totalTokensBefore);
  assert.ok(turn1.economics.capcSteadyStateUsd < turn1.economics.rawUncachedUsd);
  assert.ok(turn1.economics.capcSteadyStateUsd <= turn1.economics.rawCachedUsd);
});

test('Notation mode remains clean, negation-safe, and compatible with expand()', () => {
  const prompt = 'Por favor crie um script python usando streamlit para calcular velocidade sem banco de dados de forma bonita';
  const res = TokLangEngine.compile(prompt, { mode: 'notation' });
  assert.ok(res.text.includes('cr'));
  assert.ok(res.text.includes('$py'));
  assert.ok(res.text.includes('@streamlit'));
  assert.ok(res.text.includes('velocidade'), `Expected intact word velocidade, got: ${res.text}`);
  assert.ok(res.text.toLowerCase().includes('sem'), `Expected negation "sem" preserved, got: ${res.text}`);

  const expanded = TokLangEngine.expand('cr $py @streamlit #scr; calcular velocidade; in[distancia, tempo]; ui+');
  assert.ok(expanded.includes('Crie'));
  assert.ok(expanded.includes('Python'));
  assert.ok(expanded.includes('Streamlit'));
  assert.ok(expanded.includes('calcular velocidade'));
});
