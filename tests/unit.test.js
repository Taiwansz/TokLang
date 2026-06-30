const { test, expect } = require('@playwright/test');
const TokLangEngine = require('../js/toklang-engine.js');
const { TokLang, TokLangMiddleware } = require('../js/sdk-lib.js');

test.describe('TokLang Engine - Unit Tests', () => {
  
  test('compressLocally - simple prompt', () => {
    const prompt = "Cria um script python usando streamlit para calcular velocidade de forma bonita";
    const compressed = TokLangEngine.compressLocally(prompt);
    expect(compressed).toContain('cr');
    expect(compressed).toContain('$py');
    expect(compressed).toContain('@streamlit');
    expect(compressed).toContain('#scr');
    expect(compressed).toContain('ui+');
  });

  test('compressLocally - fallback for long prompts', () => {
    const longPrompt = 'A'.repeat(300);
    const compressed = TokLangEngine.compressLocally(longPrompt);
    expect(compressed).toBeNull();
  });

  test('compressLocally - empty/invalid inputs', () => {
    expect(TokLangEngine.compressLocally('')).toBe('');
    expect(TokLangEngine.compressLocally(null)).toBe('');
    expect(TokLangEngine.compressLocally(undefined)).toBe('');
  });

  test('compressLocally - extraction of parameters', () => {
    const prompt = "Gere uma classe em TypeScript para gerenciar usuários. Parâmetros: nome, email, senha.";
    const compressed = TokLangEngine.compressLocally(prompt);
    expect(compressed).toContain('in[nome,email,senha]');
  });

  test('compressLocally - preserves code, JSON, and strings intact', () => {
    const prompt = 'Cria uma função em python:\n```python\ndef add(x, y):\n    return x + y\n```\ncom o JSON {"status": "ok"} e a string "minha_tag".';
    const compressed = TokLangEngine.compressLocally(prompt);
    expect(compressed).toContain('def add(x, y):');
    expect(compressed).toContain('{"status": "ok"}');
    expect(compressed).toContain('"minha_tag"');
  });

  test('expand - simple TokLang shorthand', () => {
    const shorthand = "cr $py @streamlit; calcular velocidade; in[distancia, tempo]; ui+";
    const expanded = TokLangEngine.expand(shorthand);
    expect(expanded).toContain('Crie');
    expect(expanded).toContain('Python');
    expect(expanded).toContain('Streamlit');
    expect(expanded).toContain('calcular velocidade');
    expect(expanded).toContain('Entradas: [distancia, tempo]');
    expect(expanded).toContain('com interface visual bonita e estilizada');
  });

  test('expand - empty/invalid inputs', () => {
    expect(TokLangEngine.expand('')).toBe('');
    expect(TokLangEngine.expand(null)).toBe('');
    expect(TokLangEngine.expand(undefined)).toBe('');
  });

  test('expand - with customVocab object mapping', () => {
    const shorthand = "cr $myLang @myFW; task details; myTerm";
    const customVocab = {
      "$myLang": "Minha Linguagem Especial",
      "@myFW": "Meu Framework Top",
      "myTerm": "definição customizada do termo"
    };
    const expanded = TokLangEngine.expand(shorthand, customVocab);
    expect(expanded).toContain('Crie');
    expect(expanded).toContain('Minha Linguagem Especial');
    expect(expanded).toContain('Meu Framework Top');
    expect(expanded).toContain('definição customizada do termo');
  });

  test('expand - with customVocab array mapping', () => {
    const shorthand = "cr $myLang @myFW; task details; myTerm";
    const customVocab = [
      { key: "$myLang", value: "Minha Linguagem Especial" },
      { term: "@myFW", definition: "Meu Framework Top" },
      { word: "myTerm", expanded: "definição customizada do termo" }
    ];
    const expanded = TokLangEngine.expand(shorthand, customVocab);
    expect(expanded).toContain('Crie');
    expect(expanded).toContain('Minha Linguagem Especial');
    expect(expanded).toContain('Meu Framework Top');
    expect(expanded).toContain('definição customizada do termo');
  });

  test('compressLocally - with customVocab definitions', () => {
    const prompt = "Cria um script em Minha Linguagem Especial usando Meu Framework Top.";
    const customVocab = {
      "$myLang": "Minha Linguagem Especial",
      "@myFW": "Meu Framework Top"
    };
    const compressed = TokLangEngine.compressLocally(prompt, customVocab);
    expect(compressed).toContain('cr');
    expect(compressed).toContain('$myLang');
    expect(compressed).toContain('@myFW');
  });
});

test.describe('TokLang SDK & Middleware - Unit Tests', () => {

  test('TokLang client - throws without API key', () => {
    expect(() => new TokLang()).toThrow('TokLang API Key is required');
  });

  test('TokLang client - offline compress falls back to local engine', async () => {
    const client = new TokLang('mock-key');
    const prompt = "Cria um script python usando streamlit para calcular velocidade de forma bonita";
    const result = await client.compress(prompt);
    expect(result.compressed).toContain('cr');
    expect(result.savings).toBeDefined();
  });

  test('TokLang client - expand using customVocab', () => {
    const client = new TokLang('mock-key', {
      customVocab: { "$myLang": "Minha Linguagem Especial" }
    });
    const expanded = client.expand("cr $myLang");
    expect(expanded).toContain('Minha Linguagem Especial');
  });

  test('TokLangMiddleware - intercepts OpenAI request and compresses content', async () => {
    const middleware = new TokLangMiddleware({
      target: 'openai',
      apiKey: 'mock-key',
      tokLangKey: 'mock-tok-key'
    });

    const payload = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Cria uma função em python de forma bonita.' }
      ]
    };

    const originalFetch = global.fetch;
    let interceptedPrompt = null;
    global.fetch = async (url, options) => {
      if (url === 'https://api.openai.com/v1/chat/completions') {
        const body = JSON.parse(options.body);
        interceptedPrompt = body.messages[0].content;
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Mock response success' } }] })
        };
      }
      return { ok: false };
    };

    try {
      const response = await middleware.chat.completions.create(payload);
      expect(response.choices[0].message.content).toBe('Mock response success');
      expect(interceptedPrompt).toContain('cr');
      expect(interceptedPrompt).toContain('$py');
      expect(interceptedPrompt).toContain('ui+');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
