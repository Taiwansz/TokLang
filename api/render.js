import fs from 'fs';
import path from 'path';

const METADATA = {
  home: {
    title: 'TokLang v2 — Compilador Deterministico de Contexto para LLMs',
    description: 'Compilador de contexto BPE-verificado, livre de perda de negacoes e Cache-Aware (CAPC) para payloads JSON/MCP, RAG e pipelines de agentes.',
  },
  app: {
    title: 'TokLang v2 — Workbench de Compilacao BPE',
    description: 'Teste o codec estrutural tabular reversivel, poda extrativa query-aware e estabilidade de cache CAPC com contagem BPE real.',
  },
  docs: {
    title: 'Documentacao TokLang v2 — Arquitetura CAPC, Codec Tabular e SDKs',
    description: 'Especificacao tecnica completa do TokLang v2: tokenizacao BPE real, Polarity Lock, codec estrutural reversivel e middleware CAPC.',
  },
  pricing: {
    title: 'Planos — TokLang v2',
    description: 'Motor local open-core gratuito e planos gerenciados com analytics, vocabularios de equipe e SLA.',
  },
  login: {
    title: 'Entrar — TokLang',
    description: 'Acesse sua conta TokLang para gerenciar chaves de API, vocabulario e telemetria.',
  },
  signup: {
    title: 'Criar Conta — TokLang',
    description: 'Crie sua conta TokLang e audite a economia real de tokens BPE no seu pipeline de IA.',
  },
  forgot: {
    title: 'Recuperar Senha — TokLang',
    description: 'Recupere o acesso a sua conta TokLang.',
  },
  dashboard: {
    title: 'Dashboard — TokLang v2',
    description: 'Telemetria de economia BPE, gestao de vocabulario customizado e integracoes SDK.',
  },
};

export default async function handler(req, res) {
  const urlPath = req.url.split('?')[0];
  let pageName = urlPath.replace(/^\//, '').toLowerCase() || 'home';

  if (!METADATA[pageName]) {
    pageName = 'home';
  }

  try {
    const rootDir = process.cwd();
    const indexPath = path.join(rootDir, 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    const pages = ['home', 'app', 'docs', 'pricing', 'login', 'signup', 'forgot', 'dashboard'];

    for (const p of pages) {
      try {
        const pagePath = path.join(rootDir, 'pages', `${p}.html`);
        if (fs.existsSync(pagePath)) {
          const pageHtml = fs.readFileSync(pagePath, 'utf8');
          const placeholder = `<div id="page-${p}" class="page"></div>`;
          const activeClass = p === pageName ? ' active' : '';
          const replacement = `<div id="page-${p}" class="page${activeClass}">${pageHtml}</div>`;
          indexHtml = indexHtml.replace(placeholder, replacement);
        }
      } catch (err) {
        console.warn(`Erro ao carregar pagina ${p}:`, err.message);
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
    return res.status(200).send(indexHtml);
  } catch (err) {
    console.error('Erro na renderizacao SSR:', err);
    return res.status(500).send(`Erro interno no servidor: ${err.message}`);
  }
}
