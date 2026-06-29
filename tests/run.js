const assert = require('assert');
const TokLangEngine = require('../js/toklang-engine.js');
const { TokLang, TokLangMiddleware } = require('../js/sdk-lib.js');

console.log('🏁 Iniciando testes do TokLang...\n');

// 1. Testar Compilação Local (compressLocally)
console.log('🧪 Testando Compilação Local...');
try {
  // Teste 1: Prompt simples de criação em python com streamlit e visual bonito
  const p1 = "Cria um script python usando streamlit para calcular velocidade de forma bonita";
  const c1 = TokLangEngine.compressLocally(p1);
  console.log('   Input: ', p1);
  console.log('   Output:', c1);
  assert.ok(c1.includes('cr'), 'Deve conter ação de criação (cr)');
  assert.ok(c1.includes('$py'), 'Deve detectar python ($py)');
  assert.ok(c1.includes('@streamlit'), 'Deve detectar streamlit (@streamlit)');
  assert.ok(c1.includes('#scr'), 'Deve detectar script (#scr)');
  assert.ok(c1.includes('ui+'), 'Deve conter modificador visual (ui+)');
  console.log('   ✅ Teste 1 OK.');

  // Teste 2: Prompt simples de refatoração
  const p2 = "por favor consegue refatorar esse hook javascript?";
  const c2 = TokLangEngine.compressLocally(p2);
  console.log('   Input: ', p2);
  console.log('   Output:', c2);
  assert.ok(c2.includes('rf'), 'Deve conter ação de refatoração (rf)');
  assert.ok(c2.includes('$js'), 'Deve detectar javascript ($js)');
  assert.ok(c2.includes('#hook'), 'Deve detectar hook (#hook)');
  console.log('   ✅ Teste 2 OK.');

  // Teste 3: Prompt com parâmetros de entrada
  const p3 = "Gere uma classe em TypeScript para gerenciar usuários. Parâmetros: nome, email, senha.";
  const c3 = TokLangEngine.compressLocally(p3);
  console.log('   Input: ', p3);
  console.log('   Output:', c3);
  assert.ok(c3.includes('cr'), 'Deve conter ação (cr)');
  assert.ok(c3.includes('$ts'), 'Deve detectar ts ($ts)');
  assert.ok(c3.includes('#cls'), 'Deve detectar classe (#cls)');
  assert.ok(c3.includes('in[nome,email,senha]'), 'Deve extrair os parâmetros de entrada');
  console.log('   ✅ Teste 3 OK.');

  // Teste 4: Fallback para prompts muito longos / complexos
  const p4 = "A".repeat(300);
  const c4 = TokLangEngine.compressLocally(p4);
  assert.strictEqual(c4, null, 'Prompts longos devem retornar null (fallback para IA)');
  console.log('   ✅ Teste 4 OK (fallback de prompts longos).');
} catch (e) {
  console.error('❌ Falha nos testes de Compilação Local:', e);
  process.exit(1);
}

// 2. Testar Expansão Local (expand)
console.log('\n🧪 Testando Expansão Local...');
try {
  // Teste 5: Expansão simples
  const t5 = "cr $py @streamlit; calcular velocidade; in[distancia, tempo]; ui+";
  const e5 = TokLangEngine.expand(t5);
  console.log('   Input: ', t5);
  console.log('   Output:', e5);
  assert.ok(e5.startsWith('Crie'), 'Deve iniciar com a ação correta');
  assert.ok(e5.includes('Python'), 'Deve conter a linguagem expandida');
  assert.ok(e5.includes('Streamlit'), 'Deve conter o framework expandido');
  assert.ok(e5.includes('calcular velocidade'), 'Deve reter a tarefa descritiva');
  assert.ok(e5.includes('Entradas: [distancia, tempo]'), 'Deve estruturar os parâmetros');
  assert.ok(e5.includes('com interface visual bonita e estilizada'), 'Deve expandir modificadores');
  console.log('   ✅ Teste 5 OK.');

  // Teste 6: Expansão de refatoração e produção
  const t6 = "rf $js @express #mw; auth middleware; prd async cm";
  const e6 = TokLangEngine.expand(t6);
  console.log('   Input: ', t6);
  console.log('   Output:', e6);
  assert.ok(e6.startsWith('Refatore'), 'Deve iniciar com Refatore');
  assert.ok(e6.includes('JavaScript'), 'Deve conter JavaScript');
  assert.ok(e6.includes('Express.js'), 'Deve conter Express.js');
  assert.ok(e6.includes('middleware'), 'Deve conter middleware');
  assert.ok(e6.includes('pronto para produção'), 'Deve conter produção');
  assert.ok(e6.includes('com comentários explicativos'), 'Deve conter comentários');
  assert.ok(e6.includes('usando implementação assíncrona'), 'Deve conter async');
  console.log('   ✅ Teste 6 OK.');

  // Teste 7: Expansão com customVocab (objeto)
  const t7 = "cr $myLang @myFW; task details; myTerm";
  const vocab7 = {
    "$myLang": "Minha Linguagem Especial",
    "@myFW": "Meu Framework Top",
    "myTerm": "definição customizada do termo"
  };
  const e7 = TokLangEngine.expand(t7, vocab7);
  console.log('   Input: ', t7);
  console.log('   Output:', e7);
  assert.ok(e7.includes('Minha Linguagem Especial'), 'Deve expandir linguagem customizada');
  assert.ok(e7.includes('Meu Framework Top'), 'Deve expandir framework customizado');
  assert.ok(e7.includes('definição customizada do termo'), 'Deve expandir termo customizado');
  console.log('   ✅ Teste 7 OK.');

  // Teste 8: Compressão local com customVocab (objeto)
  const t8 = "Cria um script em Minha Linguagem Especial usando Meu Framework Top.";
  const c8 = TokLangEngine.compressLocally(t8, vocab7);
  console.log('   Input: ', t8);
  console.log('   Output:', c8);
  assert.ok(c8.includes('cr'), 'Deve conter cr');
  assert.ok(c8.includes('$myLang'), 'Deve conter $myLang');
  assert.ok(c8.includes('@myFW'), 'Deve conter @myFW');
  console.log('   ✅ Teste 8 OK.');
} catch (e) {
  console.error('❌ Falha nos testes de Expansão Local:', e);
  process.exit(1);
}

// 3. Testar Middleware SDK
console.log('\n🧪 Testando SDK Middleware (OpenAI)...');
try {
  const middleware = new TokLangMiddleware({
    target: 'openai',
    apiKey: 'mock-key',
    tokLangKey: 'mock-tok-key'
  });

  // Mock OpenAI completion payload
  const payload = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Você é um assistente.' },
      { role: 'user', content: 'Cria uma função em python de forma bonita.' }
    ]
  };

  // Mock global fetch to intercept OpenAI and avoid calling external network
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (url === 'https://api.openai.com/v1/chat/completions') {
      const body = JSON.parse(options.body);
      const userMessage = body.messages.find(m => m.role === 'user').content;
      console.log('   Mensagem interceptada enviada ao OpenAI:', userMessage);
      assert.ok(userMessage.includes('cr'), 'O prompt do usuário deve estar em formato TokLang');
      assert.ok(userMessage.includes('$py'), 'Deve conter token do Python');
      assert.ok(userMessage.includes('ui+'), 'Deve conter token ui+');
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Mock response success' } }] })
      };
    }
    return { ok: false };
  };

  middleware.chat.completions.create(payload).then(response => {
    assert.strictEqual(response.choices[0].message.content, 'Mock response success');
    global.fetch = originalFetch; // restore
    console.log('   ✅ Teste Middleware SDK OK.');
    console.log('\n🚀 TODOS OS TESTES PASSARAM COM SUCESSO!');
    process.exit(0);
  }).catch(e => {
    global.fetch = originalFetch;
    console.error('❌ Falha no fluxo assíncrono do middleware:', e);
    process.exit(1);
  });

} catch (e) {
  console.error('❌ Falha no teste do SDK Middleware:', e);
  process.exit(1);
}
