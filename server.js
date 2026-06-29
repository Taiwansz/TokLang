require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Local mock database for custom vocabulary
let mockVocabulary = [
  { id: 'vocab-1', user_id: 'mock-user-id', term: 'auth', definition: 'autenticação JWT via Supabase', created_at: new Date().toISOString() },
  { id: 'vocab-2', user_id: 'mock-user-id', term: 'usr_db', definition: 'tabela de usuários no postgres com campos id, nome, email', created_at: new Date().toISOString() }
];

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

app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId, email } = req.body;
  if (!priceId || !userId) return res.status(400).json({ error: 'Missing priceId or userId' });

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[MOCK] Criando sessão Stripe Mockada');
    return res.status(200).json({ url: '/#dashboard?success=true' });
  }
  // Implementação real exigiria pacote stripe configurado
  res.status(500).json({ error: 'Stripe backend integration not available locally' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
