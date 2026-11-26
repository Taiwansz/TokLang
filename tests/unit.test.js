const { test, expect } = require('@playwright/test');
const TokLangEngine = require('../js/toklang-engine.js');
const { TokLang, TokLangMiddleware } = require('../js/sdk-lib.js');

test.describe('TokLang v2 Engine & SDK - Unit Tests', () => {
  test('compile balanced preserves negations and never emits consonant skeletons', () => {
    const prompt = 'Bom dia! Por favor cria um script python usando streamlit para calcular velocidade sem banco de dados.';
    const res = TokLangEngine.compile(prompt, { mode: 'balanced' });
    expect(res.tokensAfter).toBeLessThanOrEqual(res.tokensBefore);
    expect(res.text.toLowerCase()).toContain('velocidade');
    expect(res.text.toLowerCase()).toContain('sem');
    expect(res.audit.negationsPreservedRatio).toBe(1);
  });

  test('compile notation keeps clean words and preserves negations', () => {
    const prompt = 'Cria um script python usando streamlit para calcular velocidade sem ORM de forma bonita';
    const res = TokLangEngine.compile(prompt, { mode: 'notation' });
    expect(res.text).toContain('cr');
    expect(res.text).toContain('$py');
    expect(res.text).toContain('@streamlit');
    expect(res.text).toContain('velocidade');
    expect(res.text.toLowerCase()).toContain('sem');
  });

  test('long RAG documents compile offline under hard BPE budget', () => {
    const longPrompt = Array.from({ length: 12 }, (_, i) => `Nota ${i}: controle administrativo generico.`).join('\n\n')
      + '\n\nRegra critica Raft: quorum exige floor(N/2)+1 nos e nunca permite escrita sem lider.';
    const res = TokLangEngine.compile(longPrompt, { mode: 'balanced', query: 'quorum Raft', maxTokens: 80 });
    expect(res.tokensAfter).toBeLessThanOrEqual(80);
    expect(res.text).toContain('floor(N/2)+1');
  });

  test('lossless tabular codec roundtrips bit-for-bit', () => {
    const payload = {
      users: [
        { id: 1, name: 'Alice', role: 'admin', active: true },
        { id: 2, name: 'Bob', role: 'user', active: false },
        { id: 3, name: 'Carol', role: 'staff', active: true },
      ],
    };
    const encoded = TokLangEngine.encodeStructured(payload);
    expect(encoded).toContain('@table users[3]{');
    expect(TokLangEngine.decodeStructured(encoded)).toEqual(payload);
  });

  test('CAPC middleware preserves static prefix hash and compresses dynamic turns', async () => {
    const middleware = new TokLangMiddleware({ target: 'openai', apiKey: 'mock-key', mode: 'balanced' });
    const originalFetch = global.fetch;
    let intercepted = null;
    global.fetch = async (url, options) => {
      intercepted = JSON.parse(options.body);
      return { ok: true, json: async () => ({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }) };
    };
    try {
      await middleware.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Regras de seguranca: nunca exponha chaves.' },
          { role: 'user', content: 'Ola! Por favor gere uma funcao Python sem dependencias.' },
        ],
      });
      expect(intercepted.messages[1].content.toLowerCase()).toContain('sem');
      expect(middleware.lastReport.cache.prefixHash.length).toBe(64);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('TokLang client requires API key only when remote or requireApiKey is enabled', () => {
    expect(() => new TokLang(null, { requireApiKey: true })).toThrow('TokLang API Key is required');
    const localClient = new TokLang();
    expect(localClient.expand('cr $py @streamlit; calcular velocidade; ui+')).toContain('Python');
  });
});
