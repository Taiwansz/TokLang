/**
 * TokLang Engine - Shared compiler & expander parser
 */
const PORTUGUESE_DICT = {
  // Verbos
  "adicionar": "add", "remover": "rm", "deletar": "del", "atualizar": "upd",
  "buscar": "get", "salvar": "save", "enviar": "send", "receber": "recv",
  "conectar": "conn", "configurar": "cfg", "mostrar": "show", "exibir": "show",
  "gerar": "gen", "criar": "cr", "refatorar": "rf", "otimizar": "op",
  "corrigir": "fix", "documentar": "doc", "testar": "tst", "converter": "cv",
  "calcular": "calc", "executar": "run", "iniciar": "init", "finalizar": "end",
  "parar": "stop", "limpar": "clear", "ajudar": "help", "precisar": "need",
  "querer": "want", "gostar": "like", "fazer": "make", "verificar": "chk",
  "validar": "val", "processar": "proc", "importar": "imp", "exportar": "exp",
  "desenvolver": "dev", "autenticar": "auth", "autorizar": "auth", "carregar": "load",
  "filtrar": "filt", "ordenar": "sort", "listar": "list", "inserir": "ins",
  "alterar": "alt", "modificar": "mod", "encontrar": "find", "pesquisar": "search",
  "perguntar": "ask", "responder": "resp", "escrever": "write", "ler": "read",
  "chamar": "call", "abrir": "open", "fechar": "close", "começar": "start",

  // TI / Computação
  "código": "cod", "função": "func", "funcao": "func", "classe": "cls", "script": "scr",
  "componente": "comp", "middleware": "mw", "banco": "db", "tabela": "tbl", "coluna": "col",
  "linha": "row", "chave": "key", "valor": "val", "usuário": "usr", "usuario": "usr",
  "senha": "pwd", "nome": "name", "perfil": "profile", "registro": "reg", "cadastro": "reg",
  "sessão": "sess", "sessao": "sess", "conexão": "conn", "conexao": "conn",
  "configuração": "cfg", "configuracao": "cfg", "parâmetro": "param", "parametro": "param",
  "argumento": "arg", "variável": "var", "variavel": "var", "constante": "const",
  "objeto": "obj", "lista": "list", "dicionário": "dict", "dicionario": "dict",
  "arquivo": "file", "pasta": "dir", "diretório": "dir", "diretorio": "dir",
  "caminho": "path", "erro": "err", "exceção": "exc", "excecao": "exc", "mensagem": "msg",
  "notificação": "notif", "notificacao": "notif", "alerta": "alert", "aviso": "warn",
  "sucesso": "ok", "falha": "fail", "teste": "tst", "dados": "data", "informação": "info",
  "informacao": "info", "relatório": "rep", "relatorio": "rep", "gráfico": "chart",
  "grafico": "chart", "imagem": "img", "vídeo": "vid", "video": "vid", "áudio": "aud",
  "audio": "aud", "documento": "doc", "página": "pg", "pagina": "pg", "tela": "scr",
  "botão": "btn", "botao": "btn", "campo": "fld", "entrada": "in", "saída": "out",
  "saida": "out", "projeto": "proj", "aplicação": "app", "aplicacao": "app",
  "aplicativo": "app", "sistema": "sys", "servidor": "srv", "cliente": "cli",
  "nuvem": "cloud", "rede": "net", "porta": "port", "endereço": "addr", "endereco": "addr",
  "rota": "route", "requisição": "req", "requisicao": "req", "resposta": "res",
  "cabeçalho": "hdr", "cabecalho": "hdr", "corpo": "body", "token": "tok", "filtro": "filt",
  "busca": "search", "pesquisa": "search", "velocidade": "vel", "tempo": "time",
  "data": "date", "hora": "hour", "minuto": "min", "segundo": "sec", "dia": "day",
  "mês": "month", "mes": "month", "ano": "year", "região": "reg", "regiao": "reg",
  "país": "country", "pais": "country", "estado": "state", "cidade": "city",
  "produto": "prod", "venda": "sale", "preço": "price", "preco": "price", "total": "tot",
  "quantidade": "qty", "tamanho": "size", "largura": "width", "altura": "height",
  "cor": "color", "fonte": "font", "estilo": "style", "tema": "theme", "layout": "layout",
  "painel": "panel", "dashboard": "dash", "admin": "admin", "gerenciador": "mgr",
  "serviço": "svc", "servico": "svc", "modelo": "model", "visão": "view", "visao": "view",
  "controle": "ctrl", "controlador": "ctrl", "evento": "evt", "histórico": "hist",
  "historico": "hist", "grátis": "free", "gratis": "free", "preços": "pricing",
  "precos": "pricing", "plano": "plan", "assinatura": "sub", "pagamento": "pay",
  "fatura": "invoice", "cartão": "card", "cartao": "card", "compra": "buy",
  "carrinho": "cart", "desconto": "disc", "cupom": "coup", "integração": "int",
  "integracao": "int", "suporte": "sup", "ajuda": "help", "documentação": "docs",
  "documentacao": "docs", "tutorial": "tut", "exemplo": "ex", "conceito": "concept",
  "definição": "def", "definicao": "def", "termo": "term", "palavra": "word",
  "vocabulário": "vocab", "vocabulario": "vocab", "idioma": "lang", "língua": "lang",
  "lingua": "lang", "tradução": "trans", "traducao": "trans", "ferramenta": "tool",
  "biblioteca": "lib", "pacote": "pkg", "módulo": "mod", "modulo": "mod",
  "dependência": "dep", "dependencia": "dep", "versão": "ver", "versao": "ver",
  "atualização": "upd", "atualizacao": "upd", "melhoria": "imp", "novidade": "new",
  "recurso": "feat", "funcionalidade": "feat",

  // Geral / Alta frequência
  "tarde": "trd", "noite": "nt", "manhã": "mnh", "manha": "mnh", "bonito": "bnt",
  "bonita": "bnt", "lindo": "lnd", "linda": "lnd", "bom": "bm", "boa": "ba",
  "ruim": "rm", "melhor": "mlhr", "pior": "pr", "grande": "grd", "pequeno": "pqn",
  "pequena": "pqn", "rápido": "rpd", "rapido": "rpd", "rápida": "rpd", "rapida": "rpd",
  "lento": "lnt", "lenta": "lnt", "fácil": "fcl", "facil": "fcl", "difícil": "dfcl",
  "dificil": "dfcl", "novo": "nv", "nova": "nv", "velho": "vlh", "velha": "vlh",
  "antigo": "atg", "antiga": "atg", "primeiro": "1o", "primeira": "1a", "segundo": "2o",
  "segunda": "2a", "último": "ult", "ultimo": "ult", "última": "ult", "ultima": "ult",
  "próximo": "prox", "proximo": "prox", "próxima": "prox", "proxima": "prox",
  "anterior": "ant", "atual": "act", "diferente": "diff", "igual": "eq", "mesmo": "msm",
  "mesma": "msm", "outro": "otr", "outra": "otr", "todos": "tds", "todas": "tds",
  "tudo": "td", "nada": "nd", "algo": "alg", "algum": "alg", "alguma": "alg",
  "alguns": "alg", "nenhum": "nhm", "nenhuma": "nhm", "qualquer": "qql", "muito": "mt",
  "muita": "mt", "pouco": "pc", "pouca": "pc", "mais": "ms", "menos": "mn",
  "bastante": "bst", "apenas": "apn", "somente": "smt", "sempre": "spr", "nunca": "nc",
  "talvez": "tlv", "quase": "qs", "agora": "ag", "depois": "dps", "antes": "ant",
  "hoje": "hj", "ontem": "otm", "amanhã": "amh", "amanha": "amh", "aqui": "aq",
  "ali": "al", "lá": "la", "onde": "ond", "como": "cm", "quando": "qnd",
  "porque": "pq", "porquê": "pq", "quem": "qm", "quanto": "qnt", "quanta": "qnt",
  "beleza": "blz", "verdade": "vrd", "certeza": "crtz", "dúvida": "dvd", "duvida": "dvd",
  "problema": "prob", "solução": "sol", "solucao": "sol", "pergunta": "perg",
  "resposta": "resp", "pessoa": "psa", "povo": "pv", "mundo": "mnd", "vida": "vd",
  "casa": "cs", "trabalho": "trb", "empresa": "emp", "negócio": "biz", "negocio": "biz",
  "dinheiro": "cash", "preço": "prc", "preco": "prc", "pagar": "pag", "custo": "cst",
  "desenvolvimento": "dev", "programação": "prog", "programacao": "prog",
  "tecnologia": "tech", "computador": "pc", "internet": "net", "celular": "cel",
  "telefone": "tel", "aplicativo": "app", "software": "sw", "hardware": "hw",
  "máquina": "maq", "maquina": "maq", "inteligência": "intel", "inteligencia": "intel",
  "artificial": "art"
};

const REVERSE_DICT = {};
for (const [key, val] of Object.entries(PORTUGUESE_DICT)) {
  if (val.length >= 3 || val === 'db' || val === 'pg') {
    if (!REVERSE_DICT[val] || key.length < REVERSE_DICT[val].length) {
      REVERSE_DICT[val] = key;
    }
  }
}

const ACTIONS = {
  cr: "Crie",
  fix: "Corrija o bug em",
  ex: "Explique",
  rf: "Refatore",
  op: "Otimize",
  tst: "Escreva testes para",
  doc: "Documente",
  cv: "Converta",
  rev: "Revise o código de",
  sum: "Resuma"
};

const LANGUAGES = {
  py: "Python",
  js: "JavaScript",
  ts: "TypeScript",
  sql: "SQL",
  go: "Go",
  rs: "Rust",
  sh: "Shell / Bash",
  css: "CSS",
  java: "Java",
  rb: "Ruby",
  cs: "C#",
  cpp: "C++",
  c: "C",
  php: "PHP",
  kt: "Kotlin",
  swift: "Swift",
  dart: "Dart",
  r: "R",
  lua: "Lua",
  ex: "Elixir",
  scala: "Scala",
  zig: "Zig",
  html: "HTML"
};

const FRAMEWORKS = {
  streamlit: "Streamlit",
  fastapi: "FastAPI",
  flask: "Flask",
  django: "Django",
  pandas: "Pandas",
  plt: "Matplotlib / Plotly",
  numpy: "NumPy",
  scipy: "SciPy",
  sklearn: "Scikit-learn",
  tf: "TensorFlow",
  torch: "PyTorch",
  celery: "Celery",
  sqlalchemy: "SQLAlchemy",
  react: "React",
  next: "Next.js",
  vue: "Vue.js",
  nuxt: "Nuxt.js",
  angular: "Angular",
  svelte: "Svelte",
  remix: "Remix",
  astro: "Astro",
  express: "Express.js",
  nest: "NestJS",
  fastify: "Fastify",
  hono: "Hono",
  prisma: "Prisma ORM",
  drizzle: "Drizzle ORM",
  sequelize: "Sequelize",
  typeorm: "TypeORM",
  knex: "Knex.js",
  mongoose: "Mongoose",
  pg: "PostgreSQL",
  mongo: "MongoDB",
  redis: "Redis",
  mysql: "MySQL",
  sqlite: "SQLite",
  supabase: "Supabase",
  firebase: "Firebase",
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Azure",
  docker: "Docker",
  k8s: "Kubernetes",
  jest: "Jest",
  vitest: "Vitest",
  cypress: "Cypress",
  playwright: "Playwright",
  tailwind: "Tailwind CSS",
  bootstrap: "Bootstrap",
  graphql: "GraphQL",
  grpc: "gRPC",
  swagger: "Swagger / OpenAPI",
  vite: "Vite",
  webpack: "Webpack",
  spring: "Spring Boot",
  laravel: "Laravel",
  rails: "Ruby on Rails",
  sinatra: "Sinatra",
  gin: "Gin",
  fiber: "Fiber",
  actix: "Actix Web",
  rocket: "Rocket",
  flutter: "Flutter",
  rn: "React Native",
  electron: "Electron",
  tauri: "Tauri",
  kafka: "Kafka",
  rabbitmq: "RabbitMQ"
};

const STRUCTURES = {
  fn: "função",
  cls: "classe",
  scr: "script",
  api: "API",
  comp: "componente",
  hook: "hook customizado",
  mod: "módulo",
  mw: "middleware"
};

const MODIFIERS = {
  'ui+': "com interface visual bonita e estilizada",
  prd: "pronto para produção (seguindo as melhores práticas)",
  cm: "com comentários explicativos no código",
  dk: "com exemplos práticos de uso",
  typ: "com tipagem estática/anotações de tipo",
  async: "usando implementação assíncrona",
  min: "versão minimalista/simples (sem dependências extras)",
  '*': "com máxima qualidade possível"
};

function abbreviateWord(word) {
  if (!word || typeof word !== 'string') return '';
  const lower = word.toLowerCase();
  
  // 1. Check dictionary
  if (PORTUGUESE_DICT[lower]) {
    return PORTUGUESE_DICT[lower];
  }
  
  // 2. Short words are not compressed
  if (word.length <= 3) {
    return word;
  }
  
  // 3. Apply suffix abbreviations
  let abbr = lower;
  if (abbr.endsWith('ção')) abbr = abbr.slice(0, -3) + 'ç';
  else if (abbr.endsWith('ções')) abbr = abbr.slice(0, -4) + 'ç';
  else if (abbr.endsWith('mente')) abbr = abbr.slice(0, -5) + 'mt';
  else if (abbr.endsWith('mento')) abbr = abbr.slice(0, -5) + 'mt';
  else if (abbr.endsWith('mentos')) abbr = abbr.slice(0, -6) + 'mt';
  else if (abbr.endsWith('gem')) abbr = abbr.slice(0, -3) + 'gm';
  else if (abbr.endsWith('gens')) abbr = abbr.slice(0, -4) + 'gm';
  else if (abbr.endsWith('dade')) abbr = abbr.slice(0, -4) + 'dd';
  else if (abbr.endsWith('dades')) abbr = abbr.slice(0, -5) + 'dd';
  
  // 4. Consonant skeleton
  const firstChar = abbr[0];
  const rest = abbr.slice(1);
  
  // Keep first char, remove all vowels from the rest
  const restNoVowels = rest.replace(/[aeiouáàâãéêíóôõúü]/g, '');
  
  return firstChar + restNoVowels;
}

const TokLangEngine = {
  ACTIONS,
  LANGUAGES,
  FRAMEWORKS,
  STRUCTURES,
  MODIFIERS,

  /**
   * Expands a TokLang shorthand string into a clean natural language prompt.
   * @param {string} toklangText
   * @returns {string} Natural language output
   */
  expand(toklangText, customVocab) {
    if (!toklangText || typeof toklangText !== 'string') return '';
    
    // Normalize customVocab
    const normalizedVocab = {};
    if (customVocab) {
      if (Array.isArray(customVocab)) {
        for (const item of customVocab) {
          if (!item) continue;
          if (Array.isArray(item)) {
            if (item.length >= 2) {
              normalizedVocab[item[0]] = item[1];
            }
          } else if (typeof item === 'object') {
            const key = item.key || item.term || item.word || item.token;
            const val = item.value || item.definition || item.expanded || item.translation || item.val;
            if (key && val !== undefined) {
              normalizedVocab[key] = val;
            } else {
              for (const k of Object.keys(item)) {
                normalizedVocab[k] = item[k];
              }
            }
          } else if (typeof item === 'string') {
            normalizedVocab[item] = item;
          }
        }
      } else if (typeof customVocab === 'object') {
        for (const k of Object.keys(customVocab)) {
          normalizedVocab[k] = customVocab[k];
        }
      }
    }

    const localActions = { ...ACTIONS };
    const localLanguages = { ...LANGUAGES };
    const localFrameworks = { ...FRAMEWORKS };
    const localStructures = { ...STRUCTURES };
    const localModifiers = { ...MODIFIERS };

    for (const [key, val] of Object.entries(normalizedVocab)) {
      const lowerKey = key.toLowerCase();
      if (key.startsWith('$')) {
        localLanguages[key.slice(1).toLowerCase()] = val;
      } else if (key.startsWith('@')) {
        localFrameworks[key.slice(1).toLowerCase()] = val;
      } else if (key.startsWith('#')) {
        localStructures[key.slice(1).toLowerCase()] = val;
      } else if (localActions[lowerKey]) {
        localActions[lowerKey] = val;
      } else if (localModifiers[lowerKey]) {
        localModifiers[lowerKey] = val;
      }
    }

    const parts = toklangText.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    
    // Part 1: Action and Context
    const part1 = parts[0];
    const tokens = part1.split(/\s+/);
    
    let action = '';
    let lang = '';
    let framework = '';
    let structure = '';
    
    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      if (localActions[lowerToken]) {
        action = localActions[lowerToken];
      } else if (token.startsWith('$')) {
        const lKey = token.slice(1).toLowerCase();
        lang = localLanguages[lKey] || lKey;
      } else if (token.startsWith('@')) {
        const fKey = token.slice(1).toLowerCase();
        framework = localFrameworks[fKey] || fKey;
      } else if (token.startsWith('#')) {
        const sKey = token.slice(1).toLowerCase();
        structure = localStructures[sKey] || sKey;
      }
    }
    
    let task = '';
    let inputs = [];
    let outputs = [];
    let errors = [];
    let activeModifiers = [];
    
    // Process remaining parts
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('in[')) {
        const match = part.match(/in\[(.*?)\]/);
        if (match) {
          inputs = match[1].split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (part.startsWith('out[')) {
        const match = part.match(/out\[(.*?)\]/);
        if (match) {
          outputs = match[1].split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (part.startsWith('err[')) {
        const match = part.match(/err\[(.*?)\]/);
        if (match) {
          errors = match[1].split(',').map(s => s.trim()).filter(Boolean);
        }
      } else {
        // Check if it's a list of modifiers
        const words = part.split(/\s+/);
        const modsOnly = words.every(w => localModifiers[w.toLowerCase()]);
        if (modsOnly && words.length > 0) {
          for (const w of words) {
            const mVal = localModifiers[w.toLowerCase()];
            if (mVal) activeModifiers.push(mVal);
          }
        } else {
          // It's the task description
          task = part;
        }
      }
    }
    
    // Build natural language sentence
    let result = '';
    
    // 1. Action + Context
    if (action) {
      result += action;
    } else {
      result += "Execute a tarefa";
    }
    
    if (structure) {
      result += ` ${structure}`;
    }
    
    if (lang) {
      result += ` em ${lang}`;
    }
    
    if (framework) {
      result += ` usando ${framework}`;
    }
    
    if (task) {
      result += `: ${task}`;
    }
    
    // 2. Parameters
    const paramsList = [];
    if (inputs.length > 0) {
      paramsList.push(`Entradas: [${inputs.join(', ')}]`);
    }
    if (outputs.length > 0) {
      paramsList.push(`Saídas: [${outputs.join(', ')}]`);
    }
    if (errors.length > 0) {
      paramsList.push(`Tratar erros: [${errors.join(', ')}]`);
    }
    
    if (paramsList.length > 0) {
      result += `. ${paramsList.join('; ')}`;
    }
    
    // 3. Modifiers
    if (activeModifiers.length > 0) {
      result += `. Requisitos: ${activeModifiers.join(', ')}`;
    }
    
    // Ensure final punctuation
    if (result && !result.endsWith('.')) {
      result += '.';
    }

    // General substitution for custom terms anywhere in the expanded text
    // Sort keys by length descending to avoid replacing substrings first
    const sortedTerms = Object.keys(normalizedVocab).sort((a, b) => b.length - a.length);
    for (const key of sortedTerms) {
      const val = normalizedVocab[key];
      const keysToReplace = [key];
      if (key.startsWith('$') || key.startsWith('@') || key.startsWith('#')) {
        keysToReplace.push(key.slice(1));
      }
      
      for (const k of keysToReplace) {
        if (!k || k.length < 2) continue;
        // Escape regex special chars
        const escapedKey = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const startBoundary = /^[a-zA-Z0-9_]/.test(k) ? '\\b' : '';
        const endBoundary = /[a-zA-Z0-9_]$/.test(k) ? '\\b' : '';
        const regex = new RegExp(startBoundary + escapedKey + endBoundary, 'gi');
        result = result.replace(regex, val);
      }
    }

    // Expand Portuguese abbreviations
    let wordsInResult = result.split(/([^a-zA-Z0-9áàãâéêíóôõúüçÀ-ÿ]+)/gi);
    for (let i = 0; i < wordsInResult.length; i++) {
      const w = wordsInResult[i].toLowerCase();
      if (REVERSE_DICT[w]) {
        const orig = REVERSE_DICT[w];
        if (wordsInResult[i] === wordsInResult[i].toUpperCase()) {
          wordsInResult[i] = orig.toUpperCase();
        } else if (wordsInResult[i][0] === wordsInResult[i][0].toUpperCase()) {
          wordsInResult[i] = orig[0].toUpperCase() + orig.slice(1);
        } else {
          wordsInResult[i] = orig;
        }
      }
    }
    result = wordsInResult.join('');
    
    return result;
  },

  /**
   * Attempts to compress a natural language string locally using fast heuristics.
   * If it cannot determine structured actions, returns null (indicates fallback to LLM).
   * @param {string} text
   * @returns {string|null} TokLang shorthand or null for fallback
   */
  compressLocally(text, customVocab) {
    if (!text || typeof text !== 'string') return '';
    let cleanText = text.trim();
    
    // Normalize customVocab
    const normalizedVocab = {};
    if (customVocab) {
      if (Array.isArray(customVocab)) {
        for (const item of customVocab) {
          if (!item) continue;
          if (Array.isArray(item)) {
            if (item.length >= 2) {
              normalizedVocab[item[0]] = item[1];
            }
          } else if (typeof item === 'object') {
            const key = item.key || item.term || item.word || item.token;
            const val = item.value || item.definition || item.expanded || item.translation || item.val;
            if (key && val !== undefined) {
              normalizedVocab[key] = val;
            } else {
              for (const k of Object.keys(item)) {
                normalizedVocab[k] = item[k];
              }
            }
          } else if (typeof item === 'string') {
            normalizedVocab[item] = item;
          }
        }
      } else if (typeof customVocab === 'object') {
        for (const k of Object.keys(customVocab)) {
          normalizedVocab[k] = customVocab[k];
        }
      }
    }

    // Replace definitions with keys in cleanText before heuristics
    const sortedEntries = Object.entries(normalizedVocab).sort((a, b) => b[1].length - a[1].length);
    for (const [key, val] of sortedEntries) {
      if (typeof val === 'string' && val.length > 0) {
        const escapedVal = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedVal, 'gi');
        cleanText = cleanText.replace(regex, key);
      }
    }
    
    // Phase 3: Increased limit from 250 to 800 chars
    if (cleanText.length > 800) return null;
    
    // ============================================================
    // PHASE 1: Strip greetings, politeness, filler — AGGRESSIVELY
    // ============================================================
    cleanText = cleanText
      // Full greeting sentences
      .replace(/^(ol[aá]|oi|e a[ií]|fala|salve|hey|hi|hello)[!,.]?\s*/gi, '')
      .replace(/^(bom dia|boa tarde|boa noite|good morning|good afternoon)[!,.]?\s*/gi, '')
      .replace(/^(tudo bem\??|como vai\??|beleza\??)[,.]?\s*/gi, '')
      // Politeness prefixes
      .replace(/\b(por favor|por gentileza|se possível|se poss[ií]vel|please|pls)\b[,.]?\s*/gi, '')
      .replace(/\b(obrigad[oa]|valeu|muito obrigad[oa]|thank you|thanks)\b[!,.]?\s*/gi, '')
      .replace(/\b(seria (legal|bom|ótimo|otimo|interessante|massa|top|incrível|incrivel))\b[,.]?\s*/gi, '')
      .replace(/\b(você pode|vc pode|voce pode|pode me|consegue|poderia|será que|sera que|gostaria que|queria que)\b\s*/gi, '')
      .replace(/\b(me ajud[ea]r?\s*(a|com|em)?)\b\s*/gi, '')
      .trim();

    const textLower = cleanText.toLowerCase();
    
    // ============================================================
    // PHASE 1: Expanded action detection with 40+ synonyms
    // ============================================================
    let actionToken = null;
    
    // Create/Build
    if (/\b(cri[ae]r?|faça|faca|gerar?|gere|build|create|make|construa|construir|monta?r?|monte|desenvolv[ae]r?|implement[ae]r?|escrev[ae]r?|write|set up|setup|elabor[ae]r?|program[ae]r?|cod[ae]r?|design[ae]r?)\b/.test(textLower)) actionToken = 'cr';
    // Fix/Debug
    else if (/\b(corrij[ae]r?|resolv[ae]r?|consert[ae]r?|fix|debug|arrum[ae]r?|repair|patch|troubleshoot)\b/.test(textLower)) actionToken = 'fix';
    // Explain
    else if (/\b(expliqu?[ae]r?|ensin[ae]r?|entend[ae]r?|como funciona|explain|how does|how to|o que [eé]|what is|descrev[ae]r?|detalh[ae]r?)\b/.test(textLower)) actionToken = 'ex';
    // Refactor
    else if (/\b(refator[ae]r?|refactor|limpar?|clean up|reorganiz[ae]r?|reestrutur[ae]r?|melhor[ae]r? (o )?código)\b/.test(textLower)) actionToken = 'rf';
    // Optimize
    else if (/\b(otimiz[ae]r?|optimize|performance|desempenho|speed up|acelerar|faster|mais rápid[oa])\b/.test(textLower)) actionToken = 'op';
    // Test
    else if (/\b(test[ae]r?|testes?|escreva testes|write tests|unit test|e2e|integration test|junit|cobertura)\b/.test(textLower)) actionToken = 'tst';
    // Document
    else if (/\b(document[ae]r?|escreva documenta[cç][aã]o|jsdoc|docstring|readme|swagger doc)\b/.test(textLower)) actionToken = 'doc';
    // Convert
    else if (/\b(convert[ae]r?|port[ae]r?|migrar?|transform[ae]r?|transpil[ae]r?|traduz[ai]r?|translate)\b/.test(textLower)) actionToken = 'cv';
    // Review
    else if (/\b(revis[ae]r?|code review|review|analise|analis[ae]r?|avaliar?|audit[ae]r?)\b/.test(textLower)) actionToken = 'rev';
    // Summarize
    else if (/\b(resum[aiu]r?|sumariz[ae]r?|summarize|synopsis|sinopse|tldr|tl;dr)\b/.test(textLower)) actionToken = 'sum';

    // ============================================================
    // PHASE 1b: Context-based inference — if lang/framework present but no action, assume 'cr'
    // ============================================================
    const hasLangOrFramework = /\b(python|javascript|typescript|react|vue|angular|express|django|flask|fastapi|next|node|streamlit|spring|laravel|go|rust|java|ruby|php|kotlin|swift|dart|flutter|docker|aws|firebase|supabase)\b/i.test(textLower);
    const hasNounTask = /\b(dashboard|crud|login|auth|api|app|website|site|página|pagina|painel|sistema|plataforma|bot|chatbot|scraping|crawler|parser|calculator|calculador|todo|kanban|chat|form|formulário|formulario|tabela|table|gráfico|grafico|chart|report|relatório|relatorio)\b/i.test(textLower);
    
    if (!actionToken && (hasLangOrFramework || hasNounTask)) {
      // Infer action from context
      if (/\b(scraping|crawler|extrai[ra]|extract|peg[ae]r dados|web scrap)\b/i.test(textLower)) actionToken = 'cr';
      else if (hasLangOrFramework || hasNounTask) actionToken = 'cr'; // Default: if they mention tech, they want to create
    }
    
    // Last resort: if still no action, fallback to LLM
    if (!actionToken) return null;

    // ============================================================
    // Detect language (expanded with Phase 4 languages)
    // ============================================================
    let langToken = null;
    const customLangMatch = cleanText.match(/\$[a-zA-Z0-9_]+/);
    if (customLangMatch) {
      langToken = customLangMatch[0];
    } else {
    const langPatterns = [
      [/\b(python|py)\b/i, '$py'],
      [/\b(javascript|js)\b/i, '$js'],
      [/\b(node\.?js|nodejs)\b/i, '$js'],
      [/\b(typescript|ts)\b/i, '$ts'],
      [/\bsql\b/i, '$sql'],
      [/\b(golang|go\b(?!ogle))/i, '$go'],
      [/\b(rust|\.rs)\b/i, '$rs'],
      [/\b(shell|bash|\.sh)\b/i, '$sh'],
      [/\bcss\b/i, '$css'],
      [/\bjava\b(?!script)/i, '$java'],
      [/\b(ruby|rb)\b/i, '$rb'],
      [/\b(c#|csharp|c sharp)\b/i, '$cs'],
      [/\b(c\+\+|cpp)\b/i, '$cpp'],
      [/\bphp\b/i, '$php'],
      [/\b(kotlin|kt)\b/i, '$kt'],
      [/\bswift\b/i, '$swift'],
      [/\b(dart)\b/i, '$dart'],
      [/\b(elixir)\b/i, '$ex'],
      [/\bscala\b/i, '$scala'],
      [/\blua\b/i, '$lua'],
      [/\bzig\b/i, '$zig'],
      [/\bhtml\b/i, '$html'],
    ];
    for (const [pat, tok] of langPatterns) {
      if (pat.test(textLower)) { langToken = tok; break; }
    }
    }

    // ============================================================
    // Detect Framework (expanded with Phase 4 frameworks)
    // ============================================================
    let frameworkTokens = [];
    const customFwMatches = cleanText.match(/@[a-zA-Z0-9_]+/g);
    if (customFwMatches) {
      for (const fw of customFwMatches) {
        if (!frameworkTokens.includes(fw)) frameworkTokens.push(fw);
      }
    }
    const fwPatterns = [
      [/\bstreamlit\b/i, '@streamlit'],
      [/\bfastapi\b/i, '@fastapi'],
      [/\bflask\b/i, '@flask'],
      [/\bdjango\b/i, '@django'],
      [/\bpandas\b/i, '@pandas'],
      [/\b(matplotlib|plotly)\b/i, '@plt'],
      [/\bnumpy\b/i, '@numpy'],
      [/\b(scikit.?learn|sklearn)\b/i, '@sklearn'],
      [/\b(tensorflow|tf)\b/i, '@tf'],
      [/\b(pytorch|torch)\b/i, '@torch'],
      [/\bsqlalchemy\b/i, '@sqlalchemy'],
      [/\breact\b(?!\s*native)/i, '@react'],
      [/\breact\s*native\b/i, '@rn'],
      [/\bnext\.?js\b|\bnext\b/i, '@next'],
      [/\bvue\.?js?\b|\bvue\b/i, '@vue'],
      [/\bnuxt\.?js?\b|\bnuxt\b/i, '@nuxt'],
      [/\bangular\b/i, '@angular'],
      [/\bsvelte\b/i, '@svelte'],
      [/\bremix\b/i, '@remix'],
      [/\bastro\b/i, '@astro'],
      [/\bexpress\.?js?\b|\bexpress\b/i, '@express'],
      [/\bnestjs\b|\bnest\b/i, '@nest'],
      [/\bfastify\b/i, '@fastify'],
      [/\bhono\b/i, '@hono'],
      [/\bprisma\b/i, '@prisma'],
      [/\bdrizzle\b/i, '@drizzle'],
      [/\bsequelize\b/i, '@sequelize'],
      [/\btypeorm\b/i, '@typeorm'],
      [/\bknex\b/i, '@knex'],
      [/\bmongoose\b/i, '@mongoose'],
      [/\b(postgres|postgresql)\b/i, '@pg'],
      [/\bmongo(db)?\b/i, '@mongo'],
      [/\bredis\b/i, '@redis'],
      [/\bmysql\b/i, '@mysql'],
      [/\bsqlite\b/i, '@sqlite'],
      [/\bsupabase\b/i, '@supabase'],
      [/\bfirebase\b/i, '@firebase'],
      [/\baws\b/i, '@aws'],
      [/\bdocker\b/i, '@docker'],
      [/\bkubernetes\b|\bk8s\b/i, '@k8s'],
      [/\bjest\b/i, '@jest'],
      [/\bvitest\b/i, '@vitest'],
      [/\bcypress\b/i, '@cypress'],
      [/\bplaywright\b/i, '@playwright'],
      [/\btailwind\b/i, '@tailwind'],
      [/\bbootstrap\b/i, '@bootstrap'],
      [/\bgraphql\b/i, '@graphql'],
      [/\bgrpc\b/i, '@grpc'],
      [/\bswagger\b|\bopenapi\b/i, '@swagger'],
      [/\bvite\b/i, '@vite'],
      [/\bwebpack\b/i, '@webpack'],
      [/\bspring\b/i, '@spring'],
      [/\blaravel\b/i, '@laravel'],
      [/\brails\b/i, '@rails'],
      [/\bgin\b/i, '@gin'],
      [/\bfiber\b/i, '@fiber'],
      [/\bflutter\b/i, '@flutter'],
      [/\belectron\b/i, '@electron'],
      [/\btauri\b/i, '@tauri'],
      [/\bkafka\b/i, '@kafka'],
      [/\b(rabbitmq|rabbit)\b/i, '@rabbitmq'],
      [/\bjwt\b/i, '@jwt'],
    ];
    for (const [pat, tok] of fwPatterns) {
      if (pat.test(textLower)) frameworkTokens.push(tok);
    }
    // Keep max 2 frameworks to stay concise
    frameworkTokens = frameworkTokens.slice(0, 2);

    // ============================================================
    // Detect Structure
    // ============================================================
    let structureToken = null;
    const customStructMatch = cleanText.match(/\#[a-zA-Z0-9_]+/);
    if (customStructMatch) {
      structureToken = customStructMatch[0];
    } else {
      if (/\b(fun[cç][aã]o|funcoes|fun[cç][oõ]es|function)\b/.test(textLower)) structureToken = '#fn';
    else if (/\b(classe|class)\b/.test(textLower)) structureToken = '#cls';
    else if (/\bscript\b/.test(textLower)) structureToken = '#scr';
    else if (/\b(api|rest|endpoint)\b/.test(textLower)) structureToken = '#api';
    else if (/\b(componente|component)\b/.test(textLower)) structureToken = '#comp';
    else if (/\bhook\b/.test(textLower)) structureToken = '#hook';
    else if (/\b(m[oó]dulo|module)\b/.test(textLower)) structureToken = '#mod';
    else if (/\bmiddleware\b/.test(textLower)) structureToken = '#mw';
    }

    // ============================================================
    // Modifiers detection (expanded)
    // ============================================================
    const modifiersList = [];
    if (/\b(bonit[oa]|visual|estilizad[oa]|estilos[oa]|ui|lind[oa]|interativ[oa]|responsiv[oa]|dark mode|beautiful|pretty|styled)\b/.test(textLower)) modifiersList.push('ui+');
    if (/\b(produ[cç][aã]o|boas pr[aá]ticas|prd|robust[oa]|production|scalable|escal[aá]vel|solid[oa])\b/.test(textLower)) modifiersList.push('prd');
    if (/\b(coment[aá]rios?|comentad[oa]|documented|well.?commented)\b/.test(textLower)) modifiersList.push('cm');
    if (/\b(exemplos?|pr[aá]tic[oa]|did[aá]tic[oa]|tutorial|hands.?on)\b/.test(textLower)) modifiersList.push('dk');
    if (/\b(tipagem|tipad[oa]|types?|typed|anota[cç][oõ]es? de tipo)\b/.test(textLower)) modifiersList.push('typ');
    if (/\b(ass[ií]ncron[oa]|async|await|concurrent|paralel[oa])\b/.test(textLower)) modifiersList.push('async');
    if (/\b(simples|m[ií]nim[oa]|minimalista|diret[oa]|b[aá]sic[oa]|minimal|basic|lightweight)\b/.test(textLower)) modifiersList.push('min');
    if (/\b(m[aá]xima qualidade|qualidade m[aá]xima|esmerad[oa]|premium|best possible|completo|complet[oa])\b/.test(textLower)) modifiersList.push('*');
    if (/\b(segur[oa]|security|secure|autenticad[oa]|autentica[cç][aã]o|auth|authenticated)\b/.test(textLower) && !frameworkTokens.includes('@jwt')) modifiersList.push('prd');

    // ============================================================
    // PHASE 5: Smart parameter extraction
    // ============================================================
    let inputsPart = null;
    let outputsPart = null;
    let errorsPart = null;

    // Pattern 1: "campos/parâmetros: nome, email, role"
    const fieldMatch = textLower.match(/\b(?:campos?|par[aâ]metros?|entradas?|inputs?|fields?|propriedades?|colunas?|atributos?)[\s:]+([a-zA-Z0-9áàãâéêíóôõúç_,\s]+?)(?:\.|;|$)/i);
    if (fieldMatch) {
      const fields = fieldMatch[1].split(/[,\s]+e\s+|,\s*/)
        .map(f => f.trim().replace(/^(o|a|os|as|do|da|dos|das|de|em|são|sao)\s+/i, ''))
        .filter(f => f && f.length > 1 && !/^(com|que|para|são|sao|e|ou|o|a)$/i.test(f));
      if (fields.length > 0) inputsPart = `in[${fields.join(',')}]`;
    }

    // Pattern 2: "Os campos são nome, email e role"
    if (!inputsPart) {
      const fieldsAre = textLower.match(/(?:campos?|par[aâ]metros?)\s+(?:s[aã]o|são|include|incluem)\s+([a-zA-Z0-9áàãâéêíóôõúç_,\s]+?)(?:\.|;|$)/i);
      if (fieldsAre) {
        const fields = fieldsAre[1].split(/[,\s]+e\s+|,\s*/)
          .map(f => f.trim().replace(/^(o|a|os|as|do|da|dos|das|de|em|são|sao)\s+/i, ''))
          .filter(f => f && f.length > 1 && !/^(com|que|para|e|ou|o|a)$/i.test(f));
        if (fields.length > 0) inputsPart = `in[${fields.join(',')}]`;
      }
    }

    // Pattern 3: CRUD detection → implicit params
    if (/\bcrud\b/i.test(textLower)) {
      if (!inputsPart) inputsPart = 'in[CRUD]';
    }

    // Error code detection: "erros 404 e 422" or "handle 500"
    const errMatch = textLower.match(/\b(?:erros?|errors?|trate?|handle|status)\s+(?:codes?\s+)?(\d{3}(?:\s*[,e]\s*\d{3})*)/i);
    if (errMatch) {
      const codes = errMatch[1].match(/\d{3}/g);
      if (codes && codes.length > 0) errorsPart = `err[${codes.join(',')}]`;
    }

    // ============================================================
    // PHASE 2: Clean task description — extract only meaningful words
    // ============================================================
    
    // Giant stop-word list for aggressive cleanup
    const STOP_WORDS = new Set([
      // PT articles, prepositions, pronouns, conjunctions, auxiliaries
      'um','uma','uns','umas','o','a','os','as','de','do','da','dos','das',
      'em','no','na','nos','nas','por','pelo','pela','pelos','pelas',
      'para','pra','pro','com','sem','sobre','entre','até','ate','desde',
      'que','qual','quais','como','onde','quando','quem',
      'eu','tu','ele','ela','nós','nos','vós','vos','eles','elas',
      'me','te','se','lhe','lhes','mim','ti','si','meu','minha','seu','sua',
      'este','esta','esse','essa','aquele','aquela','isso','isto','aquilo',
      'e','ou','mas','porém','porem','contudo','todavia','entretanto',
      'se','caso','embora','porque','pois','logo','portanto',
      'muito','mais','menos','bem','mal','já','ja','ainda','também','tambem',
      'não','nao','nem','nunca','jamais','sempre','talvez',
      'ser','estar','ter','haver','ir','poder','dever','querer','ficar',
      'é','sou','são','sao','foi','era','será','sera','está','esta',
      'tem','tinha','terá','tera','há','ha','houve',
      'vai','vou','vamos','pode','deve','quer','fica',
      'aqui','ali','aí','ai','lá','la','cá','ca',
      'tudo','nada','algo','alguém','alguem','ninguém','ninguem',
      'outro','outra','outros','outras','mesmo','mesma',
      'cada','todo','toda','todos','todas',
      'só','somente','apenas','bastante','demais',
      'forma','modo','maneira','tipo','jeito',
      'coisa','coisas','parte','partes','vez','vezes',
      'dia','hora','tempo','momento',
      'quero','preciso','gostaria','poderia','favor',
      'ajuda','ajudar','ajude','ajuda',
      'usar','usando','utilizar','utilizando','use',
      'ter','tendo','tenho',
      'ficar','ficando','fique',
      'código','codigo','code',
      'pedir','sua','completa','completo','web','frontend','backend','sistema','aplicação','aplicacao',
      // EN stop words
      'the','a','an','is','are','was','were','be','been','being',
      'have','has','had','do','does','did','will','would','shall','should',
      'may','might','must','can','could',
      'i','you','he','she','it','we','they','me','him','her','us','them',
      'my','your','his','its','our','their',
      'this','that','these','those',
      'in','on','at','to','for','with','from','by','about','into',
      'through','during','before','after','above','below','between',
      'of','up','out','off','over','under',
      'and','but','or','nor','not','so','yet',
      'if','then','else','when','where','while','how','what','which','who',
      'very','really','just','also','too','more','most','some','any','all',
      'here','there','now','then','always','never','often','sometimes',
      'want','need','like','please','help','using','use',
    ]);

    // Words already captured by tokens (action, lang, framework, structure, modifier keywords)
    const CAPTURED_WORDS = new Set([
      // Actions
      'criar','crie','cria','faça','faca','gerar','gere','build','create','make',
      'construa','construir','montar','monte','desenvolver','desenvolva',
      'implementar','implemente','escrever','escreva','write','setup',
      'elaborar','elabore','programar','programe','codar','code',
      'corrigir','corrija','resolver','resolva','consertar','conserte','fix','debug','arrumar','arrume',
      'explicar','explique','ensinar','ensine','entender','explain',
      'refatorar','refatore','refactor','limpar','reorganizar','reestruturar',
      'otimizar','otimize','optimize','performance','desempenho','acelerar',
      'testar','teste','testes','tst',
      'documentar','documente','document',
      'converter','converta','portar','migrar','transformar','translate',
      'revisar','revise','review','analisar','analise','avaliar','auditar',
      'resumir','resuma','summarize','sumarizar',
      // Languages
      'python','py','javascript','js','typescript','ts','sql','golang','go',
      'rust','rs','shell','bash','sh','css','java','ruby','rb','csharp',
      'cpp','php','kotlin','kt','swift','dart','elixir','scala','lua','zig','html','node','nodejs',
      // Frameworks (all of them)
      'streamlit','fastapi','flask','django','pandas','matplotlib','plotly',
      'numpy','scipy','sklearn','tensorflow','pytorch','torch','sqlalchemy',
      'react','next','nextjs','vue','vuejs','nuxt','nuxtjs','angular','svelte',
      'remix','astro','express','expressjs','nestjs','nest','fastify','hono',
      'prisma','drizzle','sequelize','typeorm','knex','mongoose',
      'postgres','postgresql','mongodb','mongo','redis','mysql','sqlite',
      'supabase','firebase','aws','docker','kubernetes','k8s',
      'jest','vitest','cypress','playwright','tailwind','bootstrap',
      'graphql','grpc','swagger','openapi','vite','webpack',
      'spring','laravel','rails','sinatra','gin','fiber','actix','rocket',
      'flutter','electron','tauri','kafka','rabbitmq','rabbit','jwt',
      // Structures
      'função','funcao','funcoes','function','classe','class','script',
      'api','rest','endpoint','componente','component','hook','módulo','modulo','module','middleware',
      // Modifiers
      'bonito','bonita','visual','estilizado','estilizada','estiloso','estilosa',
      'ui','lindo','linda','interativo','interativa','responsivo','responsiva',
      'produção','producao','boas','práticas','praticas','prd','robusto','robusta',
      'production','scalable','escalável','escalavel','sólido','solido',
      'comentários','comentarios','comentado','comentada',
      'exemplos','exemplo','prático','prática','pratico','pratica','didático','didatica',
      'tipagem','tipado','tipada','types','typed',
      'assíncrono','assíncrona','assincrono','assincrona','async','await',
      'simples','mínimo','mínima','minimo','minima','minimalista','minimal','basic','lightweight',
      'máxima','maxima','qualidade','esmerado','esmerada','premium','completo','completa',
      'seguro','segura','security','secure','autenticação','autenticacao','auth',
      // Greetings already stripped
      'olá','ola','oi','bom','boa','dia','tarde','noite','tudo','bem',
      'obrigado','obrigada','valeu','favor','gentileza','possível','possivel',
    ]);

    // Build task: split text into words, keep only meaningful ones
    const words = cleanText.split(/\s+/);
    const taskWords = [];
    for (const word of words) {
      // Skip technical tokens starting with $, @, or #
      if (/^[^a-zA-Z0-9À-ÿ]*[\$@#]/.test(word)) continue;
      
      const clean = word.replace(/^[^a-zA-Z0-9À-ÿ]+|[^a-zA-Z0-9À-ÿ]+$/g, '');
      if (!clean || clean.length <= 1) continue;
      const lw = clean.toLowerCase();
      if (STOP_WORDS.has(lw)) continue;
      if (CAPTURED_WORDS.has(lw)) continue;
      taskWords.push(abbreviateWord(clean));
    }

    // Keep max 8 meaningful words for the task
    let taskPart = taskWords.slice(0, 8).join(' ');
    // Clean up remaining artifacts
    taskPart = taskPart.replace(/^[,;.\-\s]+|[,;.\-\s]+$/g, '').trim();
    if (!taskPart) taskPart = 'tarefa';

    // ============================================================
    // Build final TokLang notation
    // ============================================================
    let part1 = actionToken;
    if (langToken) part1 += ' ' + langToken;
    for (const fw of frameworkTokens) {
      part1 += ' ' + fw;
    }
    if (structureToken) part1 += ' ' + structureToken;

    const uniqueModifiers = [...new Set(modifiersList)];

    let result = part1 + '; ' + taskPart;
    if (inputsPart) result += '; ' + inputsPart;
    if (outputsPart) result += '; ' + outputsPart;
    if (errorsPart) result += '; ' + errorsPart;
    if (uniqueModifiers.length > 0) result += '; ' + uniqueModifiers.join(' ');

    return result;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokLangEngine;
} else {
  window.TokLangEngine = TokLangEngine;
}
