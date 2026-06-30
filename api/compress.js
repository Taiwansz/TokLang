import { createClient } from '@supabase/supabase-js';

// ── Helper: dispara notificação por e-mail (fire-and-forget) ─────────────────
async function fireEmailAlert({ type, user, used, limit }) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/send-email`, {
      method:  'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-toklang-internal':   process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({
        type,
        to:    user.email,
        name:  user.user_metadata?.name || user.email.split('@')[0],
        plan:  (user.user_metadata?.plan || 'free').toLowerCase(),
        used,
        limit,
      }),
    });
  } catch (e) {
    console.warn('[compress] Email alert failed (non-blocking):', e.message);
  }
}

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Quota enforcement based on user plan
  const authHeader = req.headers.authorization;
  let user = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(token);
      user = supabaseUser;
    } catch (e) {
      console.warn('Could not verify user token:', e.message);
    }
  }

  if (user) {
    const plan = (user.user_metadata?.plan || 'free').toLowerCase();

    if (plan === 'free') {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString());

      const LIMIT = 5;
      if (count >= LIMIT) {
        // Alerta de 100% atingido
        fireEmailAlert({ type: 'usage_alert', user, used: count, limit: LIMIT });
        return res.status(402).json({ error: 'Limite diário de 5 compressões atingido para o Plano Free. Por favor, faça um upgrade.' });
      }
      // Alerta de 80% (dispara na 4ª compressão de 5)
      if (count + 1 >= Math.floor(LIMIT * 0.8)) {
        fireEmailAlert({ type: 'usage_alert', user, used: count + 1, limit: LIMIT });
      }

    } else if (plan === 'starter') {
      const { count } = await supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const LIMIT = 500;
      if (count >= LIMIT) {
        fireEmailAlert({ type: 'usage_alert', user, used: count, limit: LIMIT });
        return res.status(402).json({ error: 'Limite mensal de 500 compressões atingido para o Plano Starter. Por favor, faça um upgrade.' });
      }
      // Alerta de 80% (na 400ª compressão)
      if (count + 1 >= Math.floor(LIMIT * 0.8)) {
        fireEmailAlert({ type: 'usage_alert', user, used: count + 1, limit: LIMIT });
      }
    }
  }

  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'NVIDIA API Key not configured on server' });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-ai/deepseek-v4-flash',
        max_tokens:  150,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || 'Error from NVIDIA API');
    }

    const data = await response.json();
    const compressed = (data.choices?.[0]?.message?.content || '').trim()
      .replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return res.status(200).json({ compressed });
  } catch (error) {
    console.error('Compression error:', error);
    return res.status(500).json({ error: error.message });
  }
}
