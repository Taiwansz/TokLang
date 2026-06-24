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

// Mock Anthropic logic from api/compress.js
app.post('/api/compress', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Se não houver API key real no .env, usaremos uma resposta mockada para desenvolvimento local
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[MOCK] Comprimindo prompt localmente:', prompt);
    // Simular delay da API
    await new Promise(r => setTimeout(r, 800));
    return res.status(200).json({
      compressed: `cr $js; mock compressed prompt; prd`,
      mock: true
    });
  }

  try {
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
        system: "Você é o motor de compressão do TokLang.",
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
