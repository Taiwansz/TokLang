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

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API Key not configured on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using Haiku for faster/cheaper compression
        max_tokens: 120,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error from Anthropic API');
    }

    const data = await response.json();
    const compressed = data.content[0].text.trim();

    return res.status(200).json({ compressed });
  } catch (error) {
    console.error('Compression error:', error);
    return res.status(500).json({ error: error.message });
  }
}
