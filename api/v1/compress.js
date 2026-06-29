import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_PROMPT = `Você é o motor de compressão do TokLang... (mesmo prompt de antes)`;

export default async function handler(req, res) {
  // O SDK sempre usa POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  const { prompt } = req.body;

  if (!apiKey) return res.status(401).json({ error: 'API Key missing' });
  if (!prompt) return res.status(400).json({ error: 'Prompt missing' });

  try {
    // 1. Validar a API Key na tabela de profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Invalid API Key' });
    }

    // 2. Verificar Quota (Exemplo simples: Starter tem limite)
    if (profile.plan === 'starter') {
      const { count } = await supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      
      if (count >= 500) {
        return res.status(402).json({ error: 'Monthly quota exceeded for Starter plan. Please upgrade to Pro.' });
      }
    }

    // 3. Chamar a IA (Anthropic)
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 120,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiResponse.json();
    const compressed = aiData.content[0].text.trim();

    const countTokens = (t) => {
      if (!t || !t.trim()) return 0;
      const words = t.trim().split(/\s+/).length;
      const puncMatches = t.match(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g);
      const puncCount = puncMatches ? puncMatches.length : 0;
      return Math.max(1, Math.round(words * 1.25 + puncCount * 0.4));
    };

    const tokBefore = countTokens(prompt);
    const tokAfter = countTokens(compressed);
    const savingsPct = Math.round((1 - tokAfter / tokBefore) * 100);

    // 4. Logar uso no histórico
    await supabase.from('history').insert({
      user_id: profile.id,
      original_text: prompt,
      compressed_text: compressed,
      tokens_before: tokBefore,
      tokens_after: tokAfter,
      savings_pct: savingsPct
    });

    return res.status(200).json({
      compressed,
      savings: savingsPct + '%'
    });

  } catch (error) {
    console.error('SDK API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
