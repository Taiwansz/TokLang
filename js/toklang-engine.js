/**
 * TokLang Engine - Shared compiler & expander parser
 */
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
  cpp: "C++"
};

const FRAMEWORKS = {
  streamlit: "Streamlit",
  fastapi: "FastAPI",
  flask: "Flask",
  pandas: "Pandas",
  plt: "Matplotlib / Plotly",
  react: "React",
  next: "Next.js",
  express: "Express.js",
  prisma: "Prisma ORM",
  pg: "PostgreSQL",
  mongo: "MongoDB",
  jest: "Jest"
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
  expand(toklangText) {
    if (!toklangText || typeof toklangText !== 'string') return '';
    
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
      if (ACTIONS[lowerToken]) {
        action = ACTIONS[lowerToken];
      } else if (token.startsWith('$')) {
        const lKey = token.slice(1).toLowerCase();
        lang = LANGUAGES[lKey] || lKey;
      } else if (token.startsWith('@')) {
        const fKey = token.slice(1).toLowerCase();
        framework = FRAMEWORKS[fKey] || fKey;
      } else if (token.startsWith('#')) {
        const sKey = token.slice(1).toLowerCase();
        structure = STRUCTURES[sKey] || sKey;
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
        const modsOnly = words.every(w => MODIFIERS[w.toLowerCase()]);
        if (modsOnly && words.length > 0) {
          for (const w of words) {
            const mVal = MODIFIERS[w.toLowerCase()];
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
    
    return result;
  },

  /**
   * Attempts to compress a natural language string locally using fast heuristics.
   * If it cannot determine structured actions, returns null (indicates fallback to LLM).
   * @param {string} text
   * @returns {string|null} TokLang shorthand or null for fallback
   */
  compressLocally(text) {
    if (!text || typeof text !== 'string') return '';
    let cleanText = text.trim();
    
    // Avoid local compression for long/complex prompts
    if (cleanText.length > 250) return null;
    
    // Clean greetings and politeness
    cleanText = cleanText
      .replace(/^(por favor|bom dia|boa tarde|boa noite|ola|olá|obrigado|obrigada|favor|gentileza|gostaria de|preciso de|pode|consegue|fazer|criar)\b/gi, '')
      .trim();

    // Heuristics for Action
    let actionToken = null;
    const textLower = cleanText.toLowerCase();
    
    if (/\b(cria|crie|faça|faca|criar|create|make|gerar|gere)\b/.test(textLower)) actionToken = 'cr';
    else if (/\b(corrija|resolva|conserte|fix|debug|corrigir|resolver)\b/.test(textLower)) actionToken = 'fix';
    else if (/\b(explique|ensine|entender|como funciona|explain|how does)\b/.test(textLower)) actionToken = 'ex';
    else if (/\b(refatore|refatorar|refactor|limpar o código)\b/.test(textLower)) actionToken = 'rf';
    else if (/\b(otimize|otimizar|optimize|performance|desempenho)\b/.test(textLower)) actionToken = 'op';
    else if (/\b(teste|testes|testar|escreva testes|jest|tst|junit)\b/.test(textLower)) actionToken = 'tst';
    else if (/\b(documente|escreva documentacao|escreva documentação|document)\b/.test(textLower)) actionToken = 'doc';
    else if (/\b(converta|portar|convert|migrar|transformar)\b/.test(textLower)) actionToken = 'cv';
    else if (/\b(revise|revisar|code review|review)\b/.test(textLower)) actionToken = 'rev';
    else if (/\b(resuma|sumarize|resume|summarize)\b/.test(textLower)) actionToken = 'sum';
    
    // If no action is detected, we fallback to LLM for safety
    if (!actionToken) return null;

    // Detect language
    let langToken = null;
    if (/\b(python|py)\b/.test(textLower)) langToken = '$py';
    else if (/\b(javascript|js|node|nodejs)\b/.test(textLower)) langToken = '$js';
    else if (/\b(typescript|ts)\b/.test(textLower)) langToken = '$ts';
    else if (/\b(sql|postgres|mysql|sqlite)\b/.test(textLower)) langToken = '$sql';
    else if (/\b(golang|go)\b/.test(textLower)) langToken = '$go';
    else if (/\b(rust|rs)\b/.test(textLower)) langToken = '$rs';
    else if (/\b(shell|bash|sh)\b/.test(textLower)) langToken = '$sh';
    else if (/\b(css)\b/.test(textLower)) langToken = '$css';
    else if (/\b(java)\b/.test(textLower)) langToken = '$java';
    else if (/\b(ruby|rb)\b/.test(textLower)) langToken = '$rb';
    else if (/\b(c#|csharp)\b/.test(textLower)) langToken = '$cs';
    else if (/\b(c\+\+|cpp)\b/.test(textLower)) langToken = '$cpp';

    // Detect Framework
    let frameworkToken = null;
    if (/\bstreamlit\b/.test(textLower)) frameworkToken = '@streamlit';
    else if (/\bfastapi\b/.test(textLower)) frameworkToken = '@fastapi';
    else if (/\bflask\b/.test(textLower)) frameworkToken = '@flask';
    else if (/\bpandas\b/.test(textLower)) frameworkToken = '@pandas';
    else if (/\b(matplotlib|plotly)\b/.test(textLower)) frameworkToken = '@plt';
    else if (/\breact\b/.test(textLower)) frameworkToken = '@react';
    else if (/\bnext\b/.test(textLower)) frameworkToken = '@next';
    else if (/\bexpress\b/.test(textLower)) frameworkToken = '@express';
    else if (/\bprisma\b/.test(textLower)) frameworkToken = '@prisma';
    else if (/\bpostgres\b/.test(textLower)) frameworkToken = '@pg';
    else if (/\bmongo\b/.test(textLower)) frameworkToken = '@mongo';
    else if (/\bjest\b/.test(textLower)) frameworkToken = '@jest';

    // Detect Structure
    let structureToken = null;
    if (/\b(função|funcao|funcoes|function)\b/.test(textLower)) structureToken = '#fn';
    else if (/\b(classe|class)\b/.test(textLower)) structureToken = '#cls';
    else if (/\bscript\b/.test(textLower)) structureToken = '#scr';
    else if (/\bapi\b/.test(textLower)) structureToken = '#api';
    else if (/\bcomponente\b/.test(textLower)) structureToken = '#comp';
    else if (/\bhook\b/.test(textLower)) structureToken = '#hook';
    else if (/\bmódulo|modulo\b/.test(textLower)) structureToken = '#mod';
    else if (/\bmiddleware\b/.test(textLower)) structureToken = '#mw';

    // Build the first part
    let part1 = actionToken;
    if (langToken) part1 += ' ' + langToken;
    if (frameworkToken) part1 += ' ' + frameworkToken;
    if (structureToken) part1 += ' ' + structureToken;

    // Modifiers detection - support masculine/feminine endings (o/a)
    const modifiersList = [];
    if (/\b(bonito|bonita|visual|estilizado|estilizada|estiloso|estilosa|ui|lindo|linda)\b/.test(textLower)) modifiersList.push('ui+');
    if (/\b(produção|producao|boas práticas|boas praticas|prd|robusto|robusta)\b/.test(textLower)) modifiersList.push('prd');
    if (/\b(comentários|comentarios|comentado|comentada)\b/.test(textLower)) modifiersList.push('cm');
    if (/\b(exemplos|exemplo|prático|prática|pratico|pratica)\b/.test(textLower)) modifiersList.push('dk');
    if (/\b(tipagem|tipado|tipada|types|typescript type)\b/.test(textLower)) modifiersList.push('typ');
    if (/\b(assíncrono|assíncrona|assincrono|assincrona|async)\b/.test(textLower)) modifiersList.push('async');
    if (/\b(simples|mínimo|mínima|minimo|minima|minimalista|direto|direta)\b/.test(textLower)) modifiersList.push('min');
    if (/\b(máxima qualidade|maxima qualidade|esmerado|esmerada|\*)\b/.test(textLower)) modifiersList.push('*');

    // Extract inputs/params if any
    let inputsPart = null;
    const inMatch = textLower.match(/\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\s*([a-zA-Z0-9,\s_]+)/);
    if (inMatch) {
      const candidates = inMatch[2].split(',').map(v => v.trim()).filter(Boolean);
      const validVars = [];
      for (const cand of candidates) {
        if (/^[a-zA-Z0-9_]+$/.test(cand) && cand !== 'e' && cand !== 'ou') {
          validVars.push(cand);
        } else {
          break; // Stop on first non-variable token
        }
      }
      if (validVars.length > 0) {
        inputsPart = `in[${validVars.join(',')}]`;
      }
    }

    // Try to extract task description
    // Replace all keyword tokens and stop words to clean up the task description
    let taskClean = cleanText
      .replace(new RegExp(`\\b(cria|crie|faça|faca|criar|create|make|gerar|gere|corrija|resolva|conserte|fix|debug|corrigir|resolver|explique|ensine|entender|como funciona|explain|how does|refatore|refatorar|refactor|limpar o código|otimize|otimizar|optimize|performance|desempenho|teste|testes|testar|escreva testes|jest|tst|junit|documente|escreva documentacao|escreva documentação|document|converta|portar|convert|migrar|transformar|revise|revisar|code review|review|resuma|sumarize|resume|summarize)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(python|py|javascript|js|node|nodejs|typescript|ts|sql|postgres|mysql|sqlite|golang|go|rust|rs|shell|bash|sh|css|java|ruby|rb|c#|csharp|c\\+\\+|cpp)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(streamlit|fastapi|flask|pandas|matplotlib|plotly|react|next|express|prisma|mongodb|mongo|jest)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(função|funcao|funcoes|function|classe|class|script|api|componente|hook|módulo|modulo|middleware)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\\s*([a-zA-Z0-9,\\s_]+)`, 'gi'), '')
      .replace(new RegExp(`\\b(bonito|bonita|visual|estilizado|estilizada|estiloso|estilosa|ui|lindo|linda|produção|producao|boas práticas|boas praticas|prd|robusto|robusta|comentários|comentarios|comentado|comentada|exemplos|exemplo|prático|prática|pratico|pratica|tipagem|tipado|tipada|types|typescript type|assíncrono|assíncrona|assincrono|assincrona|async|simples|mínimo|mínima|minimo|minima|minimalista|direto|direta|máxima qualidade|maxima qualidade|esmerado|esmerada)\\b`, 'gi'), '')
      .replace(/\s+/g, ' ')
      .trim();

    // Clean up typical preposition/article leading stop words
    taskClean = taskClean
      .replace(/^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b/gi, '')
      .replace(/^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b/gi, '') // double pass for consecutive ones
      .trim();

    let taskPart = taskClean ? taskClean.substring(0, 80) : "tarefa principal";
    taskPart = taskPart.replace(/^[,;.\-\s]+|[,;.\-\s]+$/g, '');

    if (!taskPart) taskPart = "tarefa principal";

    let result = part1 + '; ' + taskPart;
    if (inputsPart) result += '; ' + inputsPart;
    if (modifiersList.length > 0) result += '; ' + modifiersList.join(' ');

    return result;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokLangEngine;
} else {
  window.TokLangEngine = TokLangEngine;
}
