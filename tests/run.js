const assert = require('assert');
const TokLangEngine = require('../js/toklang-engine.js');
const { TokLang, TokLangMiddleware } = require('../js/sdk-lib.js');

async function main() {
  console.log(`[START] TokLang v${TokLangEngine.VERSION} — Suite Unitaria & CAPC\n`);

  // 1. Clean balanced & notation compilation without consonant skeletons or negation loss
  const p1 = 'Bom dia! Por favor cria um script python usando streamlit para calcular velocidade sem ORM de forma bonita';
  const r1 = TokLangEngine.compile(p1, { mode: 'balanced' });
  assert.ok(r1.tokensAfter <= r1.tokensBefore, 'Monotonicidade BPE falhou');
  assert.ok(r1.text.toLowerCase().includes('velocidade'), 'Palavra velocidade mutilada');
  assert.ok(r1.text.toLowerCase().includes('sem'), 'Negacao sem perdida');
  assert.strictEqual(r1.audit.negationsPreservedRatio, 1, 'Ratio de negacao deve ser 1.0');

  const r1Not = TokLangEngine.compile(p1, { mode: 'notation' });
  assert.ok(r1Not.text.includes('cr') && r1Not.text.includes('$py') && r1Not.text.includes('@streamlit'));
  assert.ok(r1Not.text.includes('velocidade'), 'Modo notation nao deve gerar esqueleto consonantal');
  assert.ok(r1Not.text.toLowerCase().includes('sem'), 'Modo notation deve preservar negacoes');
  console.log('[OK] 1. Compilacao balanceada & notation sem esqueleto consonantal e com Polarity Lock');

  // 2. Lossless Structural Tabular Codec roundtrip
  const payload = {
    items: Array.from({ length: 12 }, (_, i) => ({
      sku: `SKU-${100 + i}`,
      price: 49.9 + i * 5,
      in_stock: i % 2 === 0,
    })),
  };
  const encoded = TokLangEngine.encodeStructured(payload);
  assert.ok(encoded.startsWith('@table items[12]{'));
  assert.deepStrictEqual(TokLangEngine.decodeStructured(encoded), payload);
  assert.deepStrictEqual(JSON.parse(TokLangEngine.expand(encoded)), payload);
  console.log('[OK] 2. Codec estrutural tabular lossless + decode/expand bit-a-bit');

  // 3. Long prompts handled offline under hard BPE budget
  const longDoc = Array.from({ length: 15 }, (_, i) =>
    `Secao ${i + 1}: Registro administrativo padrao sobre inventario geral sem relacao com banco.`
  ).concat([
    'Regra critica de banco PostgreSQL: nunca desabilite RLS na tabela tenant_orders e valide organization_id.',
  ]).join('\n\n');
  const rLong = TokLangEngine.compile(longDoc, {
    mode: 'balanced',
    query: 'PostgreSQL RLS tenant_orders',
    maxTokens: 90,
  });
  assert.ok(rLong.tokensAfter <= 90, `Budget excedido: ${rLong.tokensAfter}`);
  assert.ok(rLong.text.includes('tenant_orders') && rLong.text.toLowerCase().includes('nunca'));
  console.log('[OK] 3. Compressao extrativa offline de contexto longo sob budget BPE estrito');

  // 4. Preserva codigo, JSON e strings
  const pCode = 'Crie uma funcao Python:\n```python\ndef add(x, y):\n    return x + y\n```\ncom payload {"status": "ok"} e tag "minha_tag".';
  const rCode = TokLangEngine.compile(pCode, { mode: 'balanced' });
  assert.ok(rCode.text.includes('def add(x, y):'));
  assert.ok(rCode.text.includes('{"status":"ok"}') || rCode.text.includes('{"status": "ok"}'));
  assert.ok(rCode.text.includes('"minha_tag"'));
  console.log('[OK] 4. Preservacao atomica de blocos de codigo, JSON e strings');

  // 5. Expansao de notacao + customVocab
  const vocab = {
    $myLang: 'Minha Linguagem Especial',
    '@myFW': 'Meu Framework Top',
    myTerm: 'definicao customizada do termo',
  };
  const expanded = TokLangEngine.expand('cr $myLang @myFW; task details; myTerm', vocab);
  assert.ok(expanded.includes('Minha Linguagem Especial'));
  assert.ok(expanded.includes('Meu Framework Top'));
  assert.ok(expanded.includes('definicao customizada do termo'));
  console.log('[OK] 5. Expansao de notacao e vocabulario customizado');

  // 6. SDK client & CAPC Middleware
  const sdk = new TokLang('mock-key');
  const sdkRes = await sdk.compress(p1);
  assert.ok(sdkRes.tokensAfter <= sdkRes.tokensBefore);

  const middleware = new TokLangMiddleware({
    target: 'openai',
    apiKey: 'mock-key',
    mode: 'balanced',
  });

  const originalFetch = global.fetch;
  let capturedBody = null;
  global.fetch = async (url, options) => {
    if (url === 'https://api.openai.com/v1/chat/completions') {
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Mock response success' } }] }),
      };
    }
    return { ok: false };
  };

  try {
    const response = await middleware.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Voce e um engenheiro especialista em Python. Nunca gere codigo sem testes.' },
        { role: 'user', content: 'Bom dia! Por favor crie uma funcao Python sem dependencias externas.' },
      ],
    });
    assert.strictEqual(response.choices[0].message.content, 'Mock response success');
    assert.ok(capturedBody.messages[0].content.toLowerCase().includes('nunca'));
    assert.ok(capturedBody.messages[1].content.toLowerCase().includes('sem'));
    assert.ok(middleware.lastReport && middleware.lastReport.cache.prefixHash.length === 64);
    console.log('[OK] 6. SDK TokLang e TokLangMiddleware CAPC (OpenAI)');
  } finally {
    global.fetch = originalFetch;
  }

  console.log('\n[SUCCESS] Suite unitaria v2.0 100% verde.');
}

main().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
