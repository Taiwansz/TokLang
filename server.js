require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabaseAdmin = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

const fs = require('fs');

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Server-Side Rendering (SSR) for SEO-friendly pages
const METADATA = {
  home: {
    title: 'TokLang — Comprima. Comunique. Economize.',
    description: 'Middleware inteligente que comprime seus prompts de IA automaticamente. Escreva normalmente em português ou inglês e economize até 85% em tokens.',
  },
  app: {
    title: 'TokLang — Área do Compressor',
    description: 'Comprima seus prompts de IA e converta-os em notação compacta de forma rápida. Otimize seus custos de API com GPT-4, Claude e Gemini.',
  },
  docs: {
    title: 'Documentação do TokLang — Guia e Referência',
    description: 'Aprenda a usar a gramática TokLang, integrar nossa API e SDKs (Python, JS) em seu pipeline e economizar no consumo de tokens.',
  },
  pricing: {
    title: 'Nossos Planos e Preços — TokLang',
    description: 'Planos flexíveis a partir de R$ 10. Economize em suas chamadas de LLM com compressão de prompts TokLang.',
  },
  login: {
    title: 'Entrar — TokLang',
    description: 'Acesse sua conta do TokLang para gerenciar seus planos, chaves de API e visualizar suas métricas de consumo.',
  },
  signup: {
    title: 'Criar Conta — TokLang',
    description: 'Cadastre-se gratuitamente no TokLang e comece a economizar até 85% de tokens em suas chamadas de inteligência artificial.',
  },
  forgot: {
    title: 'Recuperar Senha — TokLang',
    description: 'Recupere o acesso à sua conta do TokLang de forma rápida e segura.',
  },
  dashboard: {
    title: 'Dashboard — TokLang',
    description: 'Visualize suas estatísticas de uso de compressão de prompts, gerencie sua assinatura e configure integrações.',
  }
};

const ssrRoutes = ['/', '/home', '/app', '/docs', '/pricing', '/login', '/signup', '/forgot', '/dashboard'];

app.get(ssrRoutes, (req, res) => {
  let pageName = req.path.replace(/^\//, '').toLowerCase() || 'home';
  if (!METADATA[pageName]) {
    pageName = 'home';
  }
  
  try {
    const indexPath = path.join(__dirname, 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    const pages = ['home', 'app', 'docs', 'pricing', 'login', 'signup', 'forgot', 'dashboard'];
    for (const p of pages) {
      const pagePath = path.join(__dirname, 'pages', `${p}.html`);
      if (fs.existsSync(pagePath)) {
        const pageHtml = fs.readFileSync(pagePath, 'utf8');
        const placeholder = `<div id="page-${p}" class="page"></div>`;
        const activeClass = p === pageName ? ' active' : '';
        const replacement = `<div id="page-${p}" class="page${activeClass}">${pageHtml}</div>`;
        indexHtml = indexHtml.replace(placeholder, replacement);
      }
    }

    const meta = METADATA[pageName];
    indexHtml = indexHtml.replace(/<title>.*?<\/title>/gi, `<title>${meta.title}</title>`);
    indexHtml = indexHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, `<meta name="description" content="${meta.description}">`);
    indexHtml = indexHtml.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${meta.title}">`);
    indexHtml = indexHtml.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${meta.description}">`);

    const scriptSyncHash = `
    <script>
      (function() {
        window.__SSR_PAGE__ = "${pageName}";
        if (window.location.hash.replace('#','') !== "${pageName}") {
          window.location.hash = "${pageName}";
        }
      })();
    </script>
    `;
    indexHtml = indexHtml.replace('</body>', `${scriptSyncHash}</body>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(indexHtml);
  } catch (err) {
    console.error('Local SSR Error:', err);
    res.status(500).send('Error rendering page: ' + err.message);
  }
});

// Local mock database for custom vocabulary
let mockVocabulary = [
  { id: 'vocab-1', user_id: 'mock-user-id', term: 'auth', definition: 'autenticação JWT via Supabase', created_at: new Date().toISOString() },
  { id: 'vocab-2', user_id: 'mock-user-id', term: 'usr_db', definition: 'tabela de usuários no postgres com campos id, nome, email', created_at: new Date().toISOString() }
];

// Config endpoint for dynamic client credentials loading
app.get('/api/config', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  if (process.env.NODE_ENV === 'test' || ua.includes('Playwright') || ua.includes('HeadlessChrome')) {
    return res.status(200).json({ supabaseUrl: null, supabaseAnonKey: null });
  }
  res.status(200).json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
  });
});

// Vocabulary endpoints for local development
app.get('/api/vocabulary', (req, res) => {
  const { userId } = req.query;
  const targetUserId = userId || 'mock-user-id';
  const userVocab = mockVocabulary.filter(v => v.user_id === targetUserId);
  res.status(200).json(userVocab);
});

app.post('/api/vocabulary', (req, res) => {
  const { term, definition, userId } = req.body;
  if (!term || !definition) return res.status(400).json({ error: 'Term and definition are required' });
  const targetUserId = userId || 'mock-user-id';

  // Check if term already exists for user
  const existingIndex = mockVocabulary.findIndex(v => v.user_id === targetUserId && v.term === term);
  if (existingIndex !== -1) {
    mockVocabulary[existingIndex].definition = definition;
    return res.status(200).json(mockVocabulary[existingIndex]);
  }

  const newVocab = {
    id: 'vocab-' + Math.random().toString(36).substring(2, 9),
    user_id: targetUserId,
    term,
    definition,
    created_at: new Date().toISOString()
  };
  mockVocabulary.push(newVocab);
  res.status(201).json(newVocab);
});

app.delete('/api/vocabulary/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = mockVocabulary.length;
  mockVocabulary = mockVocabulary.filter(v => v.id !== id);
  if (mockVocabulary.length === initialLength) {
    return res.status(404).json({ error: 'Vocabulary item not found' });
  }
  res.status(200).json({ success: true });
});

// Mock Anthropic logic from api/compress.js
app.post('/api/compress', async (req, res) => {
  const { prompt, userId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Enforce plan limits if Supabase admin client is initialized
  if (supabaseAdmin && userId) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();
      
      if (profile) {
        const plan = (profile.plan || 'free').toLowerCase();
        if (plan === 'free') {
          const startOfToday = new Date();
          startOfToday.setUTCHours(0, 0, 0, 0);
          const { count } = await supabaseAdmin
            .from('history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfToday.toISOString());
          
          if (count >= 5) {
            return res.status(402).json({ error: 'Limite diário de 5 compressões atingido para o Plano Free. Por favor, faça um upgrade.' });
          }
        } else if (plan === 'starter') {
          const { count } = await supabaseAdmin
            .from('history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          
          if (count >= 500) {
            return res.status(402).json({ error: 'Limite mensal de 500 compressões atingido para o Plano Starter. Por favor, faça um upgrade.' });
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar limite no banco local:', e);
    }
  }

  const targetUserId = userId || 'mock-user-id';
  const userVocab = mockVocabulary.filter(v => v.user_id === targetUserId);

  // Se não houver API key real no .env, usaremos uma resposta mockada para desenvolvimento local
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[MOCK] Comprimindo prompt localmente:', prompt);
    // Simular delay da API
    await new Promise(r => setTimeout(r, 800));

    // Basic heuristic: check if the prompt description resembles vocabulary definitions
    let compressedText = `cr $js; mock compressed prompt; prd`;
    if (userVocab.length > 0) {
      const matched = userVocab.find(v => 
        prompt.toLowerCase().includes(v.definition.toLowerCase()) || 
        prompt.toLowerCase().includes(v.term.toLowerCase())
      );
      if (matched) {
        // If matched a custom term, use it to showcase vocabulary integration locally
        compressedText = `cr $js; mock using custom term [${matched.term}]; prd`;
      }
    }

    return res.status(200).json({
      compressed: compressedText,
      mock: true
    });
  }

  try {
    let systemPrompt = `Você é o motor de compressão do TokLang. Converta prompts em linguagem natural para notação TokLang comprimida.

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

    if (userVocab.length > 0) {
      const vocabString = userVocab.map(v => `- ${v.term}: ${v.definition}`).join('\n');
      systemPrompt += `\n\nVocê também tem acesso ao seguinte VOCABULÁRIO CUSTOMIZADO do usuário. Sempre que o prompt se referir a uma destas definições, substitua-a pelo respectivo termo comprimido correspondente:\n${vocabString}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 120,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error from Anthropic API');
    }
    const data = await response.json();
    return res.status(200).json({ compressed: data.content[0].text.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint for official token counting
app.post('/api/tokenize', (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(200).json({ tokens: 0 });

  let encodingName = "cl100k_base";
  if (model === 'gpt-4o') {
    encodingName = "o200k_base";
  } else if (model === 'claude' || model === 'gemini') {
    encodingName = "cl100k_base";
  } else if (model === 'llama' || model === 'deepseek') {
    // Llama 3/DeepSeek BPE is very close to cl100k_base/o200k_base in length
    encodingName = "cl100k_base";
  }

  try {
    const { getEncoding } = require("js-tiktoken");
    const enc = getEncoding(encodingName);
    const tokens = enc.encode(prompt).length;
    return res.status(200).json({ tokens });
  } catch (e) {
    console.error("Tokenization error:", e.message);
    const fallbackTokens = Math.max(1, Math.round(prompt.length / 4));
    return res.status(200).json({ tokens: fallbackTokens });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId, email } = req.body;
  if (!priceId || !userId) return res.status(400).json({ error: 'Missing priceId or userId' });

  const ua = req.headers['user-agent'] || '';
  if (!process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'test' || ua.includes('Playwright') || ua.includes('HeadlessChrome')) {
    console.log('[MOCK] Criando sessão Stripe Mockada');
    return res.status(200).json({ url: '/#dashboard?success=true' });
  }

  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://toklang.dev'}/#dashboard?success=true`,
      cancel_url: `${req.headers.origin || 'https://toklang.dev'}/#dashboard?cancel=true`,
      metadata: {
        userId: userId,
        priceId: priceId
      },
      customer_email: email,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe Webhook Endpoint for local Express server
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!stripeClient) {
    console.warn('[Stripe Webhook Warning] Stripe client not initialized, skipping signature verification.');
    return res.status(200).json({ received: true, msg: 'Mock handled' });
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const priceId = session.metadata.priceId;
    
    const PRICE_PLAN_MAP = {
      'price_1TncHw238tVr1DQSsxeUAEOu': 'pro',
      'price_1TncHx238tVr1DQSOX9zHT8I': 'team'
    };
    const plan = PRICE_PLAN_MAP[priceId] || 'pro';

    console.log(`[Stripe Webhook] Updating user ${userId} plan to ${plan}`);
    
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { plan: plan }
      });
      if (error) {
        console.error('[Supabase Webhook Update Error]:', error);
      } else {
        console.log(`[Stripe Webhook] Supabase user ${userId} plan successfully updated to ${plan}.`);
      }
    } else {
      console.log(`[Stripe Webhook MOCK] Updated user ${userId} plan to ${plan} (No Supabase Admin Client connected)`);
    }
  }

  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
