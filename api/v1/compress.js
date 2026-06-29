import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_PROMPT = `Você é o motor de compressão do TokLang. Converta prompts em linguagem natural para notação TokLang comprimida.

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

    // 2.5 Buscar Vocabulário Customizado do usuário
    const { data: vocabList } = await supabase
      .from('vocabulary')
      .select('term, definition')
      .eq('user_id', profile.id);

    let systemPrompt = SYSTEM_PROMPT;
    if (vocabList && vocabList.length > 0) {
      const vocabString = vocabList.map(v => `- ${v.term}: ${v.definition}`).join('\n');
      systemPrompt += `\n\nVocê também tem acesso ao seguinte VOCABULÁRIO CUSTOMIZADO do usuário. Sempre que o prompt se referir a uma destas definições, substitua-a pelo respectivo termo comprimido correspondente:\n${vocabString}`;
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
        system: systemPrompt,
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

    // 4.5 Se o usuário tiver cadastrado uma URL de Webhook, disparar o evento de forma assíncrona
    if (profile.webhook_url) {
      fetch(profile.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'prompt.compressed',
          user_id: profile.id,
          original_text: prompt,
          compressed_text: compressed,
          tokens_before: tokBefore,
          tokens_after: tokAfter,
          savings_pct: savingsPct
        })
      }).catch(e => console.error('Erro ao disparar webhook do usuário:', e.message));
    }

    return res.status(200).json({
      compressed,
      savings: savingsPct + '%'
    });

  } catch (error) {
    console.error('SDK API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
