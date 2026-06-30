import fs from 'fs';
import path from 'path';

// Dicionário de metadados para cada página
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

export default async function handler(req, res) {
  // Obter a rota a partir do path (ex: /docs -> docs)
  const urlPath = req.url.split('?')[0];
  let pageName = urlPath.replace(/^\//, '').toLowerCase() || 'home';
  
  if (!METADATA[pageName]) {
    pageName = 'home';
  }

  try {
    const rootDir = process.cwd();
    const indexPath = path.join(rootDir, 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Carregar todas as páginas para renderizar no HTML final (SSR pré-populado)
    // Isso garante que robôs de busca vejam todo o conteúdo no DOM, e o JS apenas gerencia a exibição
    const pages = ['home', 'app', 'docs', 'pricing', 'login', 'signup', 'forgot', 'dashboard'];
    
    for (const p of pages) {
      try {
        const pagePath = path.join(rootDir, 'pages', `${p}.html`);
        if (fs.existsSync(pagePath)) {
          const pageHtml = fs.readFileSync(pagePath, 'utf8');
          // Injeta o conteúdo no placeholder correspondente
          const placeholder = `<div id="page-${p}" class="page"></div>`;
          const activeClass = p === pageName ? ' active' : '';
          const replacement = `<div id="page-${p}" class="page${activeClass}">${pageHtml}</div>`;
          indexHtml = indexHtml.replace(placeholder, replacement);
        }
      } catch (err) {
        console.warn(`Erro ao carregar página ${p}:`, err.message);
      }
    }

    // Injetar Meta Tags específicas da página
    const meta = METADATA[pageName];
    
    // Substituir Title
    indexHtml = indexHtml.replace(
      /<title>.*?<\/title>/gi,
      `<title>${meta.title}</title>`
    );
    
    // Substituir Meta Description
    indexHtml = indexHtml.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/gi,
      `<meta name="description" content="${meta.description}">`
    );
    
    // Substituir OpenGraph og:title
    indexHtml = indexHtml.replace(
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:title" content="${meta.title}">`
    );

    // Substituir OpenGraph og:description
    indexHtml = indexHtml.replace(
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:description" content="${meta.description}">`
    );

    // Injetar scripts de roteador para sincronizar a hash com base na rota do servidor (se o usuário acessar /docs, o roteador ativa a hash #docs)
    const scriptSyncHash = `
    <script>
      (function() {
        // Sinaliza ao roteador do cliente que a página já veio pré-renderizada pelo servidor
        window.__SSR_PAGE__ = "${pageName}";
        if (window.location.hash.replace('#','') !== "${pageName}") {
          window.location.hash = "${pageName}";
        }
      })();
    </script>
    `;
    indexHtml = indexHtml.replace('</body>', `${scriptSyncHash}</body>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(indexHtml);
  } catch (err) {
    console.error('Erro na renderização SSR:', err);
    return res.status(500).send(`Erro interno no servidor: ${err.message}`);
  }
}
