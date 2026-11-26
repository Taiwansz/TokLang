/**
 * TokLang v2.0 Core Engine
 * Deterministic, BPE-Verified, Negation-Safe, and Cache-Aware Prompt Compiler.
 *
 * Architecture:
 *  Stage 1: Atomic Segment Protection (Code fences, inline code, SQL/DDL, URLs, Few-shot, Negations)
 *  Stage 2: Lossless Structural Codec (TOON-compatible schema-hoisted @table, JSON minify, log folding)
 *  Stage 3: Deterministic Extractive Pruner (Phatic stripping, shingle dedup, BM25/entropy Knapsack)
 *  Stage 4: Cache-Aware Prompt Compression (CAPC) with deterministic SHA-256 static prefix stability
 *  Stage 5: Real BPE Tokenization & Strict Monotonicity Guard (tokensAfter <= tokensBefore)
 *
 * UMD compatible: Node.js (uses real js-tiktoken + crypto) and Browser/Extensions (zero-dependency fallback).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(true);
  } else {
    root.TokLangEngine = factory(false);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (isNode) {
  'use strict';

  const VERSION = '2.0.0';

  // ============================================================================
  // 1. REAL BPE TOKENIZER (Node: js-tiktoken | Browser: BPE-Calibrated Estimator)
  // ============================================================================
  let tiktokenLib = null;
  let nodeCrypto = null;
  const encoderCache = Object.create(null);

  if (isNode) {
    try {
      tiktokenLib = require('js-tiktoken');
    } catch (_) {
      tiktokenLib = null;
    }
    try {
      nodeCrypto = require('crypto');
    } catch (_) {
      nodeCrypto = null;
    }
  }

  function resolveEncodingName(modelOrEncoding) {
    const key = String(modelOrEncoding || 'o200k_base').toLowerCase();
    if (key === 'o200k_base' || key.includes('gpt-4o') || key.includes('gpt-4.1') || key.includes('gpt-5') || /^o[134]/.test(key)) {
      return 'o200k_base';
    }
    if (key === 'cl100k_base' || key.includes('claude') || key.includes('llama') || key.includes('deepseek') || key.includes('gemini') || key.includes('gpt-4')) {
      return 'cl100k_base';
    }
    return 'o200k_base';
  }

  function getBpeEncoder(modelOrEncoding) {
    if (!tiktokenLib) return null;
    const encName = resolveEncodingName(modelOrEncoding);
    if (!encoderCache[encName]) {
      encoderCache[encName] = tiktokenLib.getEncoding(encName);
    }
    return encoderCache[encName];
  }

  function estimateBpeTokensFallback(text) {
    if (!text) return 0;
    const chunks = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ_]+|[0-9]{1,3}|\s+|[^\sA-Za-zÀ-ÖØ-öø-ÿ0-9_]/g);
    if (!chunks) return 0;
    let total = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (/^\s+$/.test(c)) {
        if (c.includes('\n')) total += (c.match(/\n/g) || []).length;
        else if (c.length > 2) total += Math.ceil(c.length / 4);
        continue;
      }
      if (/^[0-9]+$/.test(c)) {
        total += 1;
        continue;
      }
      if (/^[A-Za-z_]+$/.test(c)) {
        total += c.length <= 7 ? 1 : Math.ceil(c.length / 4.6);
        continue;
      }
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ_]+$/.test(c)) {
        const nonAscii = (c.match(/[^\x00-\x7F]/g) || []).length;
        total += Math.max(1, Math.ceil((c.length + nonAscii * 0.65) / 4.2));
        continue;
      }
      total += 1;
    }
    return Math.max(1, Math.round(total));
  }

  function countTokens(text, modelOrEncoding = 'o200k_base') {
    if (!text || typeof text !== 'string') return 0;
    const encoder = getBpeEncoder(modelOrEncoding);
    if (encoder) {
      return encoder.encode(text).length;
    }
    return estimateBpeTokensFallback(text);
  }

  function getTokenizerMetadata(modelOrEncoding = 'o200k_base') {
    const encName = resolveEncodingName(modelOrEncoding);
    return {
      encoding: encName,
      exact: Boolean(getBpeEncoder(encName)),
      source: getBpeEncoder(encName) ? `js-tiktoken:${encName}` : `bpe-calibrated-fallback:${encName}`,
    };
  }

  // ============================================================================
  // 2. DETERMINISTIC SHA-256 (Node crypto + Pure JS Synchronous Fallback)
  // ============================================================================
  function sha256Pure(asciiStr) {
    const utf8 = unescape(encodeURIComponent(asciiStr));
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const bitLen = utf8.length * 8;
    const words = [];
    for (let i = 0; i < utf8.length; i++) {
      words[i >> 2] |= utf8.charCodeAt(i) << (24 - (i % 4) * 8);
    }
    words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
    const totalWords = (((utf8.length + 8) >> 6) + 1) * 16;
    while (words.length < totalWords - 2) words.push(0);
    words.push(Math.floor(bitLen / 0x100000000));
    words.push(bitLen >>> 0);

    const W = new Array(64);
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));

    for (let i = 0; i < words.length; i += 16) {
      for (let t = 0; t < 16; t++) W[t] = words[i + t] | 0;
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
        const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
        const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      H = [
        (H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
        (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0,
      ];
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function sha256Hex(text) {
    if (nodeCrypto) {
      return nodeCrypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
    }
    return sha256Pure(String(text));
  }

  // ============================================================================
  // 3. LOSSLESS STRUCTURAL CODEC (TOON-Compatible Schema-Hoisted @table)
  // ============================================================================
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function isPrimitive(v) {
    return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
  }

  function isUniformPrimitiveArray(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return false;
    const keySet = new Set();
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (!isPlainObject(row)) return false;
      const keys = Object.keys(row);
      if (keys.length === 0) return false;
      for (const k of keys) {
        if (!isPrimitive(row[k])) return false;
        if (/[{},\n\r:]/.test(k)) return false;
        keySet.add(k);
      }
    }
    const totalKeys = keySet.size;
    if (totalKeys === 0) return false;
    // Require reasonable schema density (>= 70% populated across rows)
    let populated = 0;
    for (let i = 0; i < arr.length; i++) {
      populated += Object.keys(arr[i]).length;
    }
    return populated / (arr.length * totalKeys) >= 0.7;
  }

  function encodeTabularCell(val) {
    if (val === undefined) return '__UNDEF__';
    if (val === null) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'null';
    const str = String(val);
    const needsQuotes =
      str.length === 0 ||
      str !== str.trim() ||
      str === 'null' ||
      str === 'true' ||
      str === 'false' ||
      str === '__UNDEF__' ||
      /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(str) ||
      /[|\n\r"\\]/.test(str);
    return needsQuotes ? JSON.stringify(str) : str;
  }

  function decodeTabularCell(raw) {
    if (raw === '__UNDEF__') return undefined;
    if (raw === 'null') return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return JSON.parse(raw);
    }
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
      return Number(raw);
    }
    return raw;
  }

  function splitTabularRow(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    let escaped = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        current += ch;
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inQuotes = false;
        }
      } else if (ch === '"') {
        inQuotes = true;
        current += ch;
      } else if (ch === '|') {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  function formatTableBlock(name, arr) {
    const cols = [];
    const seen = new Set();
    for (const row of arr) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          cols.push(k);
        }
      }
    }
    const headerPrefix = name ? `@table ${name}[${arr.length}]{${cols.join(',')}}:` : `@table[${arr.length}]{${cols.join(',')}}:`;
    const lines = [headerPrefix];
    for (const row of arr) {
      const cells = cols.map((col) => (Object.prototype.hasOwnProperty.call(row, col) ? encodeTabularCell(row[col]) : '__UNDEF__'));
      lines.push(cells.join('|'));
    }
    return lines.join('\n');
  }

  function encodeStructured(value) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (isUniformPrimitiveArray(parsed)) {
      return formatTableBlock('', parsed);
    }
    if (isPlainObject(parsed)) {
      const keys = Object.keys(parsed);
      if (keys.length === 1 && isUniformPrimitiveArray(parsed[keys[0]])) {
        return formatTableBlock(keys[0], parsed[keys[0]]);
      }
      const hasAnyTable = keys.some((k) => isUniformPrimitiveArray(parsed[k]));
      if (hasAnyTable) {
        const lines = ['@struct{'];
        for (const k of keys) {
          if (isUniformPrimitiveArray(parsed[k])) {
            lines.push(formatTableBlock(k, parsed[k]));
          } else {
            lines.push(`@kv ${k}: ${JSON.stringify(parsed[k])}`);
          }
        }
        lines.push('}');
        return lines.join('\n');
      }
    }
    return JSON.stringify(parsed);
  }

  function parseTableLines(headerLine, bodyLines) {
    const match = headerLine.match(/^@table(?:\s+([^{\[\s]+))?\[(\d+)\]\{([^}]+)\}:$/);
    if (!match) {
      throw new SyntaxError(`Invalid TokLang @table header: ${headerLine}`);
    }
    const name = match[1] || '';
    const expectedCount = Number(match[2]);
    const cols = match[3].split(',').map((c) => c.trim());
    const rows = [];
    for (let i = 0; i < expectedCount; i++) {
      const rawLine = bodyLines[i];
      if (rawLine === undefined) {
        throw new SyntaxError(`Truncated @table "${name}": expected ${expectedCount} rows, found ${i}`);
      }
      const cells = splitTabularRow(rawLine);
      const obj = {};
      for (let c = 0; c < cols.length; c++) {
        const decoded = decodeTabularCell(cells[c]);
        if (decoded !== undefined) {
          obj[cols[c]] = decoded;
        }
      }
      rows.push(obj);
    }
    return { name, rows, consumed: expectedCount };
  }

  function decodeStructured(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (trimmed.startsWith('@table')) {
      const lines = trimmed.split(/\r?\n/);
      const { name, rows } = parseTableLines(lines[0], lines.slice(1));
      return name ? { [name]: rows } : rows;
    }
    if (trimmed.startsWith('@struct{') && trimmed.endsWith('}')) {
      const lines = trimmed.split(/\r?\n/).slice(1, -1);
      const result = {};
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) {
          i++;
          continue;
        }
        if (line.startsWith('@table')) {
          const { name, rows, consumed } = parseTableLines(line, lines.slice(i + 1));
          result[name] = rows;
          i += 1 + consumed;
        } else if (line.startsWith('@kv ')) {
          const colonIdx = line.indexOf(':');
          const key = line.slice(4, colonIdx).trim();
          const valJson = line.slice(colonIdx + 1).trim();
          result[key] = JSON.parse(valJson);
          i++;
        } else {
          i++;
        }
      }
      return result;
    }
    return JSON.parse(trimmed);
  }

  // ============================================================================
  // 4. POLARITY, NEGATION LOCK & ENTITY INVARIANTS
  // ============================================================================
  const NEGATION_REGEX = /\b(n[aã]o|nem|nunca|jamais|sem|exceto|proibid[oa]s?|evit[ae]r?|apenas|somente|not|never|nor|without|except|only|forbidden|prohibited|avoid|cannot|can't|don't|doesn't|didn't|won't|mustn't|shouldn't|no\s+(?:longer|more|external|auth|orm|cache|mock))\b|!=|!==|<>|<=|>=/gi;

  function extractNegationTokens(text) {
    const matches = String(text || '').match(NEGATION_REGEX);
    if (!matches) return [];
    return matches.map((m) => m.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  }

  function hasNegationOrConstraint(sentence) {
    NEGATION_REGEX.lastIndex = 0;
    return NEGATION_REGEX.test(sentence);
  }

  function extractProtectedEntities(text) {
    const entities = new Set();
    const patterns = [
      /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/g,            // CONSTANTS_LIKE_THIS
      /\b[a-z]+_[a-z0-9_]+\b/g,                   // snake_case identifiers
      /\b[a-z]+[A-Z][A-Za-z0-9]+\b/g,             // camelCase identifiers
      /\b(?:https?:\/\/\S+|\/[\w./-]+)\b/g,       // URLs / paths
      /\b\d+(?:[.,]\d+)?%?\b/g,                   // numbers / percentages
      /\b(?:SQL|DDL|RLS|JWT|API|REST|CRUD|LGPD|Raft|Paxos|ACID|CAP|O\([^)]+\)|floor\([^)]+\))\b/gi,
    ];
    for (const pat of patterns) {
      const found = String(text || '').match(pat);
      if (found) {
        for (const item of found) entities.add(item);
      }
    }
    return [...entities];
  }

  // ============================================================================
  // 5. ATOMIC SEGMENT PROTECTION & EMBEDDED JSON / LOG OPTIMIZATION
  // ============================================================================
  function protectSegments(text, options) {
    const preserves = [];
    const stages = new Set();
    let working = text;

    const addPreserve = (content, kind) => {
      const token = `__TL_SEG_${preserves.length}__`;
      preserves.push({ token, content, kind });
      return token;
    };

    // 1. Fenced code blocks (verbatim protection, only strip trailing spaces on lines)
    working = working.replace(/```[\s\S]*?```/g, (match) => {
      const cleaned = match.replace(/[ \t]+\n/g, '\n');
      return addPreserve(cleaned, 'code_fence');
    });

    // 2. Inline code spans
    working = working.replace(/`[^`\n]+`/g, (match) => addPreserve(match, 'code_inline'));

    // 3. Few-shot example blocks (linear line-bounded matcher, zero ReDoS backtracking)
    working = working.replace(
      /(?:^|\n)((?:Exemplo|Example|Input|Entrada)\s*\d*\s*:[^\n]*\n(?:Output|Response|Sa[ií]da|Resultado)\s*:[^\n]*)/gi,
      (full, block) => {
        const leading = full.startsWith('\n') ? '\n' : '';
        return leading + addPreserve(block, 'few_shot');
      }
    );

    // 4. Embedded JSON objects / arrays (brace-matched, evaluated with BPE Guard)
    const model = options.encoding || options.model || 'o200k_base';
    let idx = 0;
    while (idx < working.length) {
      const ch = working[idx];
      if (ch === '{' || ch === '[') {
        const openCh = ch;
        const closeCh = ch === '{' ? '}' : ']';
        let depth = 1;
        let j = idx + 1;
        let inStr = false;
        let esc = false;
        while (j < working.length && depth > 0) {
          const cur = working[j];
          if (inStr) {
            if (esc) esc = false;
            else if (cur === '\\') esc = true;
            else if (cur === '"') inStr = false;
          } else {
            if (cur === '"') inStr = true;
            else if (cur === openCh) depth++;
            else if (cur === closeCh) depth--;
          }
          j++;
        }
        if (depth === 0) {
          const candidate = working.slice(idx, j);
          if (candidate.length >= 16) {
            try {
              const parsed = JSON.parse(candidate);
              if (parsed !== null && typeof parsed === 'object') {
                const rawToks = countTokens(candidate, model);
                const minified = JSON.stringify(parsed);
                const minToks = countTokens(minified, model);
                const tabular = encodeStructured(parsed);
                const tabToks = countTokens(tabular, model);

                let best = candidate;
                let bestToks = rawToks;
                let kind = 'json_raw';

                if (minToks < bestToks) {
                  best = minified;
                  bestToks = minToks;
                  kind = 'json_minified';
                }
                if (tabToks < bestToks) {
                  best = tabular;
                  bestToks = tabToks;
                  kind = 'structural_tabular';
                }
                if (kind === 'structural_tabular') stages.add('structural_tabular');
                else if (kind === 'json_minified') stages.add('json_minify');

                const placeholder = addPreserve(best, kind);
                working = working.slice(0, idx) + placeholder + working.slice(j);
                idx += placeholder.length;
                continue;
              }
            } catch (_) {
              // Not valid JSON; leave untouched
            }
          }
        }
      }
      idx++;
    }

    return { working, preserves, stages };
  }

  function restoreSegments(text, preserves) {
    let output = text;
    // Restore in reverse order in case of nested references
    for (let i = preserves.length - 1; i >= 0; i--) {
      output = output.split(preserves[i].token).join(preserves[i].content);
    }
    return output;
  }

  // ============================================================================
  // 6. LOG FOLDING, PHATIC CLEANUP & SHINGLE DEDUPLICATION
  // ============================================================================
  function foldRepetitiveLogs(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 3) return { text, folded: false };
    const out = [];
    let folded = false;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        out.push(line);
        i++;
        continue;
      }
      let run = 1;
      while (i + run < lines.length && lines[i + run] === line) {
        run++;
      }
      if (run >= 3) {
        out.push(`${line} [x${run}]`);
        folded = true;
      } else {
        for (let k = 0; k < run; k++) out.push(line);
      }
      i += run;
    }
    return { text: out.join('\n'), folded };
  }

  function stripPhaticNoise(text, level) {
    let out = text;

    // Greetings & pure conversational padding (safe across all modes)
    out = out
      .replace(/^(?:ol[aá]|oi|e a[ií]|fala|salve|hey|hi(?:\s+there)?|hello(?:\s+everyone)?)[!,.:\s]+/i, '')
      .replace(/^(?:bom dia|boa tarde|boa noite|good morning|good afternoon|good evening)[!,.:\s]+/i, '')
      .replace(/^(?:tudo bem\??|como vai\??|espero que esteja bem[.!]?|hope you are doing well[.!]?)[,.:\s]*/i, '')
      .replace(/\b(?:por favor|por gentileza|se poss[ií]vel|please|kindly)\b[,!:\s]*/gi, ' ')
      .replace(/\b(?:(?:muito\s+)?obrigad[oa](?:\s+desde\s+j[aá])?|valeu|thank you(?:\s+in\s+advance)?|thanks(?:\s+in\s+advance)?)[!,.:\s]*/gi, ' ')
      .replace(/\b(?:voc[eê]\s+poderia|voce\s+pode|voc[eê]\s+pode|vc\s+pode|poderia\s+me\s+ajudar\s+a|pode\s+me\s+ajudar\s+a|gostaria\s+que\s+voc[eê]|could\s+you\s+please|would\s+you\s+mind|can\s+you\s+help\s+me\s+to)\b\s*/gi, '');

    if (level === 'balanced' || level === 'aggressive') {
      // Natural BPE-friendly concise rewrites (real dictionary words only, zero consonant skeletons)
      const phraseMap = [
        [/\bcom o objetivo de\b/gi, 'para'],
        [/\ba fim de\b/gi, 'para'],
        [/\bno que diz respeito a\b/gi, 'sobre'],
        [/\bem rela[cç][aã]o a\b/gi, 'sobre'],
        [/(?:^|(?<=[\s.!?]))[eé]\s+importante\s+ressaltar\s+que[,]?\s*/gi, ''],
        [/\bvale destacar que\b[,]?\s*/gi, ''],
        [/\bcomo mencionado anteriormente\b[,]?\s*/gi, ''],
        [/\bseria (?:legal|bom|[oó]timo|interessante)\s+(?:se|ter)\b/gi, 'inclua'],
        [/\bin order to\b/gi, 'to'],
        [/\bdue to the fact that\b/gi, 'because'],
        [/\bat this point in time\b/gi, 'now'],
        [/\bit is important to note that\b[,]?\s*/gi, ''],
        [/\bplease note that\b[,]?\s*/gi, ''],
        [/\bas mentioned previously\b[,]?\s*/gi, ''],
      ];
      for (const [pat, rep] of phraseMap) {
        out = out.replace(pat, rep);
      }
    }

    // Normalize whitespace without collapsing intentional paragraph breaks
    out = out
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s*[,;:\-]+\s*/, '')
      .trim();

    if (out.length > 1 && /^[a-záàâãéêíóôõúç]/.test(out)) {
      out = out[0].toUpperCase() + out.slice(1);
    }
    out = out.replace(/([.!?]\s+)([a-záàâãéêíóôõúç])/g, (_, sep, ch) => sep + ch.toUpperCase());
    return out;
  }

  function makeWordShingles(text, k = 3) {
    const words = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const set = new Set();
    if (words.length < k) {
      if (words.length > 0) set.add(words.join(' '));
      return set;
    }
    for (let i = 0; i <= words.length - k; i++) {
      set.add(words.slice(i, i + k).join(' '));
    }
    return set;
  }

  function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  function splitSemanticUnits(text) {
    const paragraphs = text.split(/\n{2,}/);
    const units = [];
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx].trim();
      if (!para) continue;
      // Keep placeholder-heavy or multi-line structured paragraphs atomic
      if (para.includes('__TL_SEG_') || para.includes('\n')) {
        units.push({ text: para, paragraphBreak: pIdx > 0 });
        continue;
      }
      const sentences = para.split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9_`__])/);
      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
        const s = sentences[sIdx].trim();
        if (s) {
          units.push({ text: s, paragraphBreak: sIdx === 0 && pIdx > 0 });
        }
      }
    }
    return units;
  }

  function deduplicateUnits(units, level) {
    const kept = [];
    const exactSeen = new Set();
    const shingleBank = [];
    let removed = 0;
    const threshold = level === 'aggressive' ? 0.68 : 0.78;

    for (const unit of units) {
      if (unit.text.includes('__TL_SEG_')) {
        kept.push(unit);
        continue;
      }
      const norm = unit.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (exactSeen.has(norm)) {
        removed++;
        continue;
      }
      if (level !== 'lossless' && norm.length > 35) {
        const sh = makeWordShingles(norm, 3);
        const unitNegs = extractNegationTokens(unit.text).join(',');
        let nearDup = false;
        for (const prev of shingleBank) {
          if (jaccardSimilarity(sh, prev.shingles) >= threshold) {
            // Never deduplicate if new sentence carries a negation absent in the kept one
            if (!unitNegs || prev.negs === unitNegs) {
              nearDup = true;
              break;
            }
          }
        }
        if (nearDup) {
          removed++;
          continue;
        }
        shingleBank.push({ shingles: sh, negs: unitNegs });
      }
      exactSeen.add(norm);
      kept.push(unit);
    }
    return { units: kept, removed };
  }

  // ============================================================================
  // 7. QUERY-AWARE EXTRACTIVE RANKING (BM25 + ENTROPY + POLARITY LOCK)
  // ============================================================================
  const RANKING_STOPWORDS = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com',
    'um', 'uma', 'que', 'se', 'como', 'mais', 'mas', 'ou', 'ao', 'aos', 'as', 'os', 'the', 'and', 'for',
    'that', 'this', 'with', 'from', 'are', 'was', 'were', 'have', 'has', 'had', 'been', 'into', 'about',
  ]);

  function tokenizeForBM25(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_+#]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1 && !RANKING_STOPWORDS.has(t));
  }

  function joinUnits(units) {
    let out = '';
    for (let i = 0; i < units.length; i++) {
      if (i === 0) {
        out = units[i].text;
      } else {
        out += (units[i].paragraphBreak ? '\n\n' : ' ') + units[i].text;
      }
    }
    return out;
  }

  function extractiveSelect(units, preserves, options) {
    const model = options.encoding || options.model || 'o200k_base';
    const maxTokens = options.maxTokens && options.maxTokens > 0 ? options.maxTokens : null;
    const queryTerms = tokenizeForBM25(options.query || '');
    const querySet = new Set(queryTerms);
    const focusTerms = new Set((options.focusTerms || []).map((t) => String(t).toLowerCase()));

    // Quick pre-check: avoid scoring when entire text easily fits budget
    const fullRendered = restoreSegments(joinUnits(units), preserves);
    const currentTotal = countTokens(fullRendered, model);
    let targetBudget = maxTokens;
    if (!targetBudget && options.mode === 'aggressive' && currentTotal > 180) {
      const ratio = typeof options.targetRatio === 'number' ? Math.max(0.2, Math.min(0.95, options.targetRatio)) : 0.65;
      targetBudget = Math.max(80, Math.floor(currentTotal * ratio));
    }

    if (!targetBudget || currentTotal <= targetBudget) {
      return { units, pruned: false, truncated: false, renderedText: fullRendered, renderedTokens: currentTotal };
    }

    const docs = units.map((u) => tokenizeForBM25(u.text));
    const N = Math.max(1, docs.length);
    const avgdl = docs.reduce((acc, d) => acc + d.length, 0) / N || 1;
    const df = Object.create(null);
    for (const d of docs) {
      const uniq = new Set(d);
      for (const term of uniq) df[term] = (df[term] || 0) + 1;
    }

    const k1 = 1.5;
    const b = 0.75;

    // Calibrate fast per-unit token scale against exact fullRendered BPE count (1 BPE call instead of N!)
    const fastFullEst = Math.max(1, estimateBpeTokensFallback(fullRendered));
    const bpeScale = currentTotal / fastFullEst;

    const scored = units.map((unit, idx) => {
      const rendered = restoreSegments(unit.text, preserves);
      const tokens = Math.max(1, Math.round(estimateBpeTokensFallback(rendered) * bpeScale));
      const terms = docs[idx];
      const dl = Math.max(1, terms.length);

      let idfSum = 0;
      const tf = Object.create(null);
      for (const term of terms) {
        tf[term] = (tf[term] || 0) + 1;
      }
      for (const term of Object.keys(tf)) {
        const idf = Math.log(1 + (N - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5));
        idfSum += idf;
      }
      const lexicalEntropy = idfSum / Math.sqrt(dl);

      let bm25 = 0;
      let queryHits = 0;
      if (querySet.size > 0) {
        for (const q of querySet) {
          const freq = tf[q] || 0;
          if (freq > 0) {
            queryHits++;
            const idf = Math.log(1 + (N - (df[q] || 0) + 0.5) / ((df[q] || 0) + 0.5));
            bm25 += idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * dl) / avgdl)));
          }
        }
      }

      let focusBonus = 0;
      const lower = rendered.toLowerCase();
      for (const ft of focusTerms) {
        if (ft && lower.includes(ft)) focusBonus += 6.0;
      }

      const hasProtectedSeg = unit.text.includes('__TL_SEG_');
      const hasNeg = hasNegationOrConstraint(rendered);
      const entityCount = extractProtectedEntities(rendered).length;
      const posBonus = idx === 0 || idx === units.length - 1 ? 0.6 : 0;

      const score =
        bm25 * 5.0 +
        focusBonus +
        lexicalEntropy +
        Math.min(entityCount, 6) * 0.45 +
        (hasNeg ? 2.5 : 0) +
        (hasProtectedSeg ? 4.0 : 0) +
        posBonus;

      return {
        idx,
        unit,
        tokens,
        score,
        density: score / Math.max(1, tokens),
        queryHits,
      };
    });

    const ranked = [...scored].sort((a, bItem) => {
      if (querySet.size > 0 && (a.queryHits > 0) !== (bItem.queryHits > 0)) {
        return bItem.queryHits - a.queryHits;
      }
      if (bItem.score !== a.score) return bItem.score - a.score;
      return bItem.density - a.density;
    });

    const chosen = new Set();
    const chosenOrder = [];
    let used = 0;
    for (const item of ranked) {
      const joinOverhead = chosenOrder.length > 0 ? 1 : 0;
      if (used + item.tokens + joinOverhead <= targetBudget) {
        chosen.add(item.idx);
        chosenOrder.push(item.idx);
        used += item.tokens + joinOverhead;
      }
    }

    if (chosen.size === 0 && ranked.length > 0) {
      chosen.add(ranked[0].idx);
      chosenOrder.push(ranked[0].idx);
    }

    let selectedUnits = units.filter((_, idx) => chosen.has(idx));
    let rendered = restoreSegments(joinUnits(selectedUnits), preserves);
    let exactTokens = countTokens(rendered, model);

    // Exact BPE verification: evict lowest-ranked noise units before tail truncation can ever occur
    while (chosenOrder.length > 1 && exactTokens > targetBudget) {
      const evictedIdx = chosenOrder.pop();
      chosen.delete(evictedIdx);
      selectedUnits = units.filter((_, idx) => chosen.has(idx));
      rendered = restoreSegments(joinUnits(selectedUnits), preserves);
      exactTokens = countTokens(rendered, model);
    }

    return {
      units: selectedUnits,
      pruned: selectedUnits.length < units.length,
      truncated: selectedUnits.length < units.length,
      renderedText: rendered,
      renderedTokens: exactTokens,
    };
  }

  function hardFitToBudget(text, maxTokens, model) {
    if (!maxTokens || maxTokens <= 0) return { text, truncated: false };
    if (countTokens(text, model) <= maxTokens) return { text, truncated: false };

    const encoder = getBpeEncoder(model);
    if (encoder) {
      const ids = encoder.encode(text);
      if (ids.length <= maxTokens) return { text, truncated: false };
      const sliced = encoder.decode(ids.slice(0, maxTokens));
      return { text: sliced.trimEnd(), truncated: true };
    }

    const words = text.split(/\s+/);
    let lo = 1;
    let hi = words.length;
    let best = words[0] || '';
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const cand = words.slice(0, mid).join(' ');
      if (countTokens(cand, model) <= maxTokens) {
        best = cand;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return { text: best, truncated: true };
  }

  // ============================================================================
  // 8. CLEAN NOTATION MODE (NO CONSONANT SKELETONS, NEGATION-SAFE, EXPANDABLE)
  // ============================================================================
  const ACTIONS = {
    cr: 'Crie',
    fix: 'Corrija o bug em',
    ex: 'Explique',
    rf: 'Refatore',
    op: 'Otimize',
    tst: 'Escreva testes para',
    doc: 'Documente',
    cv: 'Converta',
    rev: 'Revise o código de',
    sum: 'Resuma',
  };

  const LANGUAGES = {
    py: 'Python', js: 'JavaScript', ts: 'TypeScript', sql: 'SQL', go: 'Go',
    rs: 'Rust', sh: 'Shell / Bash', css: 'CSS', java: 'Java', rb: 'Ruby',
    cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP', kt: 'Kotlin', swift: 'Swift',
    dart: 'Dart', r: 'R', lua: 'Lua', ex: 'Elixir', scala: 'Scala', zig: 'Zig', html: 'HTML',
  };

  const FRAMEWORKS = {
    streamlit: 'Streamlit', fastapi: 'FastAPI', flask: 'Flask', django: 'Django',
    pandas: 'Pandas', plt: 'Matplotlib / Plotly', numpy: 'NumPy', scipy: 'SciPy',
    sklearn: 'Scikit-learn', tf: 'TensorFlow', torch: 'PyTorch', celery: 'Celery',
    sqlalchemy: 'SQLAlchemy', react: 'React', next: 'Next.js', vue: 'Vue.js',
    nuxt: 'Nuxt.js', angular: 'Angular', svelte: 'Svelte', remix: 'Remix', astro: 'Astro',
    express: 'Express.js', nest: 'NestJS', fastify: 'Fastify', hono: 'Hono',
    prisma: 'Prisma ORM', drizzle: 'Drizzle ORM', sequelize: 'Sequelize',
    typeorm: 'TypeORM', knex: 'Knex.js', mongoose: 'Mongoose', pg: 'PostgreSQL',
    mongo: 'MongoDB', redis: 'Redis', mysql: 'MySQL', sqlite: 'SQLite',
    supabase: 'Supabase', firebase: 'Firebase', aws: 'AWS', gcp: 'Google Cloud',
    azure: 'Azure', docker: 'Docker', k8s: 'Kubernetes', jest: 'Jest', vitest: 'Vitest',
    cypress: 'Cypress', playwright: 'Playwright', tailwind: 'Tailwind CSS',
    bootstrap: 'Bootstrap', graphql: 'GraphQL', grpc: 'gRPC', swagger: 'Swagger / OpenAPI',
    vite: 'Vite', webpack: 'Webpack', spring: 'Spring Boot', laravel: 'Laravel',
    rails: 'Ruby on Rails', sinatra: 'Sinatra', gin: 'Gin', fiber: 'Fiber',
    actix: 'Actix Web', rocket: 'Rocket', flutter: 'Flutter', rn: 'React Native',
    electron: 'Electron', kafka: 'Kafka', rabbitmq: 'RabbitMQ', jwt: 'JWT',
  };

  const STRUCTURES = {
    fn: 'função', cls: 'classe', scr: 'script', api: 'API',
    comp: 'componente', hook: 'hook customizado', mod: 'módulo', mw: 'middleware',
  };

  const MODIFIERS = {
    'ui+': 'com interface visual bonita e estilizada',
    prd: 'pronto para produção (seguindo as melhores práticas)',
    cm: 'com comentários explicativos no código',
    dk: 'com exemplos práticos de uso',
    typ: 'com tipagem estática/anotações de tipo',
    async: 'usando implementação assíncrona',
    min: 'versão minimalista/simples (sem dependências extras)',
    '*': 'com máxima qualidade possível',
  };

  // Safe stop words for notation mode: STRICTLY EXCLUDES ALL NEGATIONS AND RESTRICTORS
  const SAFE_NOTATION_STOPWORDS = new Set([
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'para', 'pra', 'pro', 'com',
    'que', 'qual', 'quais', 'como', 'eu', 'me', 'meu', 'minha', 'seu', 'sua',
    'este', 'esta', 'esse', 'essa', 'isso', 'isto', 'e', 'ou', 'mas', 'porque', 'pois',
    'muito', 'bem', 'ja', 'já', 'ainda', 'tambem', 'também', 'ser', 'estar', 'ter', 'ir',
    'poder', 'querer', 'ficar', 'é', 'foi', 'está', 'esta', 'tem', 'vai', 'vou', 'pode',
    'quero', 'preciso', 'gostaria', 'poderia', 'favor', 'ajuda', 'ajudar', 'ajude',
    'usar', 'usando', 'utilizar', 'utilizando', 'use', 'forma', 'modo', 'jeito',
    'código', 'codigo', 'code', 'the', 'a', 'an', 'is', 'are', 'to', 'for', 'with',
    'of', 'in', 'on', 'and', 'please', 'help', 'using', 'want', 'need', 'like',
  ]);

  function normalizeCustomVocab(customVocab) {
    const normalized = {};
    if (!customVocab) return normalized;
    if (Array.isArray(customVocab)) {
      for (const item of customVocab) {
        if (!item) continue;
        if (Array.isArray(item) && item.length >= 2) {
          normalized[item[0]] = item[1];
        } else if (typeof item === 'object') {
          const key = item.key || item.term || item.word || item.token;
          const val = item.value || item.definition || item.expanded || item.translation || item.val;
          if (key && val !== undefined) {
            normalized[key] = val;
          } else {
            for (const k of Object.keys(item)) normalized[k] = item[k];
          }
        }
      }
    } else if (typeof customVocab === 'object') {
      for (const k of Object.keys(customVocab)) normalized[k] = customVocab[k];
    }
    return normalized;
  }

  function compileNotation(text, customVocab, options = {}) {
    if (!text || typeof text !== 'string') return '';
    const vocab = normalizeCustomVocab(customVocab);
    const { working, preserves } = protectSegments(text.trim(), options);
    let cleanText = working;

    const sortedEntries = Object.entries(vocab).sort((a, b) => String(b[1]).length - String(a[1]).length);
    for (const [key, val] of sortedEntries) {
      if (typeof val === 'string' && val.length > 0) {
        const escaped = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        cleanText = cleanText.replace(new RegExp(escaped, 'gi'), key);
      }
    }

    cleanText = stripPhaticNoise(cleanText, 'lossless');
    const textLower = cleanText.toLowerCase();

    let actionToken = null;
    if (/\b(cri[ae]r?|fa[cç]a|gerar?|gere|build|create|make|constru[ai]r?|monta?r?|monte|desenvolv[ae]r?|implement[ae]r?|escrev[ae]r?|write|setup|program[ae]r?)\b/.test(textLower)) actionToken = 'cr';
    else if (/\b(corrij[ae]r?|resolv[ae]r?|consert[ae]r?|fix|debug|arrum[ae]r?|repair|patch|troubleshoot)\b/.test(textLower)) actionToken = 'fix';
    else if (/\b(expliqu?[ae]r?|ensin[ae]r?|entend[ae]r?|como funciona|explain|how does|how to|descrev[ae]r?)\b/.test(textLower)) actionToken = 'ex';
    else if (/\b(refator[ae]r?|refactor|reorganiz[ae]r?|reestrutur[ae]r?)\b/.test(textLower)) actionToken = 'rf';
    else if (/\b(otimiz[ae]r?|optimize|performance|desempenho|acelerar|speed up)\b/.test(textLower)) actionToken = 'op';
    else if (/\b(test[ae]r?|testes?|unit test|e2e|integration test|cobertura)\b/.test(textLower)) actionToken = 'tst';
    else if (/\b(document[ae]r?|jsdoc|docstring|readme)\b/.test(textLower)) actionToken = 'doc';
    else if (/\b(convert[ae]r?|port[ae]r?|migrar?|transform[ae]r?|transpil[ae]r?|traduz[ai]r?)\b/.test(textLower)) actionToken = 'cv';
    else if (/\b(revis[ae]r?|code review|review|analis[ae]r?|audit[ae]r?)\b/.test(textLower)) actionToken = 'rev';
    else if (/\b(resum[aiu]r?|sumariz[ae]r?|summarize|tldr)\b/.test(textLower)) actionToken = 'sum';

    if (!actionToken) return null;

    let langToken = null;
    const customLangMatch = cleanText.match(/\$[a-zA-Z0-9_]+/);
    if (customLangMatch) {
      langToken = customLangMatch[0];
    } else {
      const langPatterns = [
        [/\b(python|py)\b/i, '$py'],
        [/\b(typescript|ts)\b/i, '$ts'],
        [/\b(javascript|js|node\.?js|nodejs)\b/i, '$js'],
        [/\bsql\b/i, '$sql'],
        [/\b(golang|go\b(?!ogle))/i, '$go'],
        [/\b(rust|\.rs)\b/i, '$rs'],
        [/\b(shell|bash|\.sh)\b/i, '$sh'],
        [/\bcss\b/i, '$css'],
        [/\bjava\b(?!script)/i, '$java'],
        [/\b(ruby|rb)\b/i, '$rb'],
        [/\b(c#|csharp)\b/i, '$cs'],
        [/\b(c\+\+|cpp)\b/i, '$cpp'],
        [/\bphp\b/i, '$php'],
        [/\b(kotlin|kt)\b/i, '$kt'],
        [/\bswift\b/i, '$swift'],
        [/\bhtml\b/i, '$html'],
      ];
      for (const [pat, tok] of langPatterns) {
        if (pat.test(textLower)) {
          langToken = tok;
          break;
        }
      }
    }

    const frameworkTokens = [];
    const customFwMatches = cleanText.match(/@[a-zA-Z0-9_]+/g);
    if (customFwMatches) {
      for (const fw of customFwMatches) {
        if (!frameworkTokens.includes(fw)) frameworkTokens.push(fw);
      }
    }
    const fwPatterns = [
      [/\bstreamlit\b/i, '@streamlit'], [/\bfastapi\b/i, '@fastapi'], [/\bflask\b/i, '@flask'],
      [/\bdjango\b/i, '@django'], [/\bpandas\b/i, '@pandas'], [/\b(matplotlib|plotly)\b/i, '@plt'],
      [/\bnumpy\b/i, '@numpy'], [/\breact\s*native\b/i, '@rn'], [/\breact\b(?!\s*native)/i, '@react'],
      [/\bnext\.?js\b|\bnext\b/i, '@next'], [/\bvue\.?js?\b|\bvue\b/i, '@vue'],
      [/\bexpress\.?js?\b|\bexpress\b/i, '@express'], [/\bnestjs\b/i, '@nest'],
      [/\bprisma\b/i, '@prisma'], [/\bdrizzle\b/i, '@drizzle'],
      [/\b(postgres|postgresql)\b/i, '@pg'], [/\bmongo(?:db)?\b/i, '@mongo'],
      [/\bredis\b/i, '@redis'], [/\bsupabase\b/i, '@supabase'], [/\bdocker\b/i, '@docker'],
      [/\bjest\b/i, '@jest'], [/\bvitest\b/i, '@vitest'], [/\bplaywright\b/i, '@playwright'],
      [/\btailwind\b/i, '@tailwind'], [/\bjwt\b/i, '@jwt'],
    ];
    for (const [pat, tok] of fwPatterns) {
      if (pat.test(textLower) && !frameworkTokens.includes(tok)) {
        frameworkTokens.push(tok);
      }
    }

    let structureToken = null;
    const customStruct = cleanText.match(/#[a-zA-Z0-9_]+/);
    if (customStruct) {
      structureToken = customStruct[0];
    } else if (/\b(fun[cç][aã]o|funcoes|function)\b/.test(textLower)) structureToken = '#fn';
    else if (/\b(classe|class)\b/.test(textLower)) structureToken = '#cls';
    else if (/\bscript\b/.test(textLower)) structureToken = '#scr';
    else if (/\b(api|rest|endpoint)\b/.test(textLower)) structureToken = '#api';
    else if (/\b(componente|component)\b/.test(textLower)) structureToken = '#comp';
    else if (/\bhook\b/.test(textLower)) structureToken = '#hook';
    else if (/\b(m[oó]dulo|module)\b/.test(textLower)) structureToken = '#mod';
    else if (/\bmiddleware\b/.test(textLower)) structureToken = '#mw';

    const modifiers = [];
    if (/\b(bonit[oa]|visual|estilizad[oa]|ui|lind[oa]|interativ[oa]|responsiv[oa]|styled)\b/.test(textLower)) modifiers.push('ui+');
    if (/\b(produ[cç][aã]o|boas pr[aá]ticas|prd|robust[oa]|production)\b/.test(textLower)) modifiers.push('prd');
    if (/\b(coment[aá]rios?|comentad[oa]|well.?commented)\b/.test(textLower)) modifiers.push('cm');
    if (/\b(exemplos?|pr[aá]tic[oa]|did[aá]tic[oa])\b/.test(textLower)) modifiers.push('dk');
    if (/\b(tipagem|tipad[oa]|typed|type hints)\b/.test(textLower)) modifiers.push('typ');
    if (/\b(ass[ií]ncron[oa]|async)\b/.test(textLower)) modifiers.push('async');
    if (/\b(minimalista|minimal|lightweight)\b/.test(textLower)) modifiers.push('min');

    let inputsPart = null;
    let errorsPart = null;
    const fieldMatch = textLower.match(/\b(?:campos?|par[aâ]metros?|entradas?|inputs?|fields?)(?:\s+s[aã]o|\s*:)\s*([a-zA-Z0-9áàãâéêíóôõúç_,\s]+?)(?:\.|;|$)/i);
    if (fieldMatch) {
      const fields = fieldMatch[1]
        .split(/\s+e\s+|,\s*/)
        .map((f) => f.trim().replace(/^(?:o|a|os|as)\s+/i, ''))
        .filter((f) => f && f.length > 1 && !/^(?:e|ou|com|para)$/.test(f));
      if (fields.length > 0) inputsPart = `in[${fields.join(',')}]`;
    } else if (/\bcrud\b/i.test(textLower)) {
      inputsPart = 'in[CRUD]';
    }

    const errMatch = textLower.match(/\b(?:erros?|errors?|status)\s+(?:codes?\s+)?(\d{3}(?:\s*[,e]\s*\d{3})*)/i);
    if (errMatch) {
      const codes = errMatch[1].match(/\d{3}/g);
      if (codes && codes.length > 0) errorsPart = `err[${codes.join(',')}]`;
    }

    // Build intact task words: NO consonant skeleton, NO negation stripping!
    const capturedWords = new Set([
      'criar', 'crie', 'cria', 'faça', 'faca', 'gerar', 'gere', 'create', 'make', 'build',
      'corrigir', 'corrija', 'fix', 'debug', 'explicar', 'explique', 'explain',
      'refatorar', 'refatore', 'refactor', 'otimizar', 'otimize', 'optimize',
      'testar', 'testes', 'documentar', 'documente', 'converter', 'converta', 'revisar', 'revise', 'resumir', 'resuma',
      'python', 'py', 'javascript', 'js', 'typescript', 'ts', 'node', 'nodejs', 'sql', 'golang', 'rust',
      'streamlit', 'fastapi', 'flask', 'django', 'pandas', 'plotly', 'matplotlib', 'react', 'next', 'express',
      'prisma', 'postgres', 'postgresql', 'mongo', 'mongodb', 'redis', 'supabase', 'docker', 'jest', 'vitest',
      'função', 'funcao', 'function', 'classe', 'class', 'script', 'api', 'rest', 'componente', 'hook', 'módulo', 'modulo', 'middleware',
      'bonito', 'bonita', 'visual', 'estilizado', 'pronto', 'produção', 'producao', 'comentários', 'comentarios', 'exemplos', 'tipagem', 'assíncrono', 'minimalista',
    ]);

    let taskSource = cleanText.replace(/\b(?:campos?|par[aâ]metros?|entradas?|inputs?|fields?)(?:\s+s[aã]o|\s*:)\s*[a-zA-Z0-9áàãâéêíóôõúç_,\s]+?(?:\.|;|$)/gi, '');
    const rawWords = taskSource.split(/\s+/);
    const taskWords = [];
    for (const w of rawWords) {
      if (w.includes('__TL_SEG_')) {
        taskWords.push(w);
        continue;
      }
      if (/^[\$@#][a-zA-Z0-9_]+$/.test(w)) continue;
      const stripped = w.replace(/^[^a-zA-Z0-9À-ÿ!=<>]+|[^a-zA-Z0-9À-ÿ!=<>]+$/g, '');
      if (!stripped) continue;
      const lw = stripped.toLowerCase();
      if (SAFE_NOTATION_STOPWORDS.has(lw)) continue;
      if (capturedWords.has(lw)) continue;
      // Keep the real BPE dictionary word intact (ZERO consonant skeletons!)
      taskWords.push(stripped);
    }

    let header = actionToken;
    if (langToken) header += ' ' + langToken;
    for (const fw of frameworkTokens.slice(0, 3)) header += ' ' + fw;
    if (structureToken) header += ' ' + structureToken;

    const parts = [header];
    if (taskWords.length > 0) parts.push(taskWords.join(' '));
    if (inputsPart) parts.push(inputsPart);
    if (errorsPart) parts.push(errorsPart);
    if (modifiers.length > 0) parts.push([...new Set(modifiers)].join(' '));

    return restoreSegments(parts.join('; '), preserves);
  }

  function expand(toklangText, customVocab) {
    if (!toklangText || typeof toklangText !== 'string') return '';
    const trimmed = toklangText.trim();

    // If input is a TokLang v2 structured payload (@table / @struct), decode back to formatted JSON
    if (trimmed.startsWith('@table') || trimmed.startsWith('@struct{')) {
      return JSON.stringify(decodeStructured(trimmed), null, 2);
    }

    const vocab = normalizeCustomVocab(customVocab);
    const localActions = { ...ACTIONS };
    const localLanguages = { ...LANGUAGES };
    const localFrameworks = { ...FRAMEWORKS };
    const localStructures = { ...STRUCTURES };
    const localModifiers = { ...MODIFIERS };

    for (const [key, val] of Object.entries(vocab)) {
      const lowerKey = key.toLowerCase();
      if (key.startsWith('$')) localLanguages[key.slice(1).toLowerCase()] = val;
      else if (key.startsWith('@')) localFrameworks[key.slice(1).toLowerCase()] = val;
      else if (key.startsWith('#')) localStructures[key.slice(1).toLowerCase()] = val;
      else if (localActions[lowerKey]) localActions[lowerKey] = val;
      else if (localModifiers[lowerKey]) localModifiers[lowerKey] = val;
    }

    const parts = trimmed.split(';').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return '';

    const tokens = parts[0].split(/\s+/);
    let action = '';
    let lang = '';
    const frameworks = [];
    let structure = '';

    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      if (localActions[lowerToken]) action = localActions[lowerToken];
      else if (token.startsWith('$')) lang = localLanguages[token.slice(1).toLowerCase()] || token.slice(1);
      else if (token.startsWith('@')) frameworks.push(localFrameworks[token.slice(1).toLowerCase()] || token.slice(1));
      else if (token.startsWith('#')) structure = localStructures[token.slice(1).toLowerCase()] || token.slice(1);
    }

    let task = '';
    let inputs = [];
    let outputs = [];
    let errors = [];
    const activeModifiers = [];

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('in[')) {
        const m = part.match(/in\[(.*?)\]/);
        if (m) inputs = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      } else if (part.startsWith('out[')) {
        const m = part.match(/out\[(.*?)\]/);
        if (m) outputs = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      } else if (part.startsWith('err[')) {
        const m = part.match(/err\[(.*?)\]/);
        if (m) errors = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        const words = part.split(/\s+/);
        if (words.length > 0 && words.every((w) => localModifiers[w.toLowerCase()])) {
          for (const w of words) activeModifiers.push(localModifiers[w.toLowerCase()]);
        } else {
          task = task ? `${task}; ${part}` : part;
        }
      }
    }

    let result = action || 'Execute a tarefa';
    if (structure) result += ` ${structure}`;
    if (lang) result += ` em ${lang}`;
    if (frameworks.length > 0) result += ` usando ${frameworks.join(' e ')}`;
    if (task) result += `: ${task}`;

    const paramsList = [];
    if (inputs.length > 0) paramsList.push(`Entradas: [${inputs.join(', ')}]`);
    if (outputs.length > 0) paramsList.push(`Saídas: [${outputs.join(', ')}]`);
    if (errors.length > 0) paramsList.push(`Tratar erros: [${errors.join(', ')}]`);
    if (paramsList.length > 0) result += `. ${paramsList.join('; ')}`;
    if (activeModifiers.length > 0) result += `. Requisitos: ${activeModifiers.join(', ')}`;
    if (result && !result.endsWith('.')) result += '.';

    const sortedTerms = Object.keys(vocab).sort((a, b) => b.length - a.length);
    for (const key of sortedTerms) {
      const val = vocab[key];
      const keysToReplace = [key];
      if (key.startsWith('$') || key.startsWith('@') || key.startsWith('#')) keysToReplace.push(key.slice(1));
      for (const k of keysToReplace) {
        if (!k || k.length < 2) continue;
        const escapedKey = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const startB = /^[a-zA-Z0-9_]/.test(k) ? '\\b' : '';
        const endB = /[a-zA-Z0-9_]$/.test(k) ? '\\b' : '';
        result = result.replace(new RegExp(startB + escapedKey + endB, 'gi'), val);
      }
    }

    return result;
  }

  // ============================================================================
  // 9. MAIN v2 COMPILER PIPELINE (WITH BPE MONOTONICITY GUARD & AUDIT REPORT)
  // ============================================================================
  function dedupeExactSentencesForAudit(text) {
    const seen = new Set();
    const kept = [];
    const parts = String(text || '').split(/(?<=[.!?])\s+|\n+/);
    for (const part of parts) {
      const norm = part.trim().toLowerCase().replace(/\s+/g, ' ');
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        kept.push(part.trim());
      }
    }
    return kept.join(' ');
  }

  function buildCompileReport(rawText, compiledText, model, stagesApplied, truncated, startMs, extra = {}) {
    const tokensBefore = typeof extra.tokensBefore === 'number' ? extra.tokensBefore : countTokens(rawText, model);
    const tokensAfter = typeof extra.tokensAfter === 'number' ? extra.tokensAfter : countTokens(compiledText, model);
    const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
    const savingsPct = tokensBefore > 0 ? Number(((tokensSaved / tokensBefore) * 100).toFixed(2)) : 0;
    const flopsRatio = tokensBefore > 0 ? Math.pow(tokensAfter / tokensBefore, 2) : 1;
    const attentionFlopsReductionPct = tokensBefore > 0 ? Number(((1 - Math.min(1, flopsRatio)) * 100).toFixed(2)) : 0;

    const rawNegs = extractNegationTokens(dedupeExactSentencesForAudit(rawText));
    const outNegs = extractNegationTokens(compiledText);
    let preservedNegCount = 0;
    const outCounts = Object.create(null);
    for (const n of outNegs) outCounts[n] = (outCounts[n] || 0) + 1;
    for (const n of rawNegs) {
      if (outCounts[n] > 0) {
        preservedNegCount++;
        outCounts[n]--;
      }
    }
    const negationsPreservedRatio = rawNegs.length === 0 ? 1 : Number((preservedNegCount / rawNegs.length).toFixed(4));

    return {
      version: VERSION,
      mode: extra.mode || 'balanced',
      text: compiledText,
      tokensBefore,
      tokensAfter,
      tokensSaved,
      savingsPct,
      attentionFlopsReductionPct,
      truncated: Boolean(truncated),
      monotonicFallback: Boolean(extra.monotonicFallback),
      reversibleStructured: Boolean(extra.reversibleStructured),
      prefixHash: sha256Hex(compiledText),
      stagesApplied: [...stagesApplied],
      tokenizer: getTokenizerMetadata(model),
      latencyMs: Number((Date.now() - startMs).toFixed(2)),
      audit: {
        rawNegationsCount: rawNegs.length,
        preservedNegationsCount: preservedNegCount,
        negationsPreservedRatio,
        monotonicBpeVerified: tokensAfter <= tokensBefore,
      },
    };
  }

  function compile(input, options = {}) {
    const startMs = Date.now();
    const rawText = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
    const mode = options.mode || 'balanced'; // lossless | balanced | aggressive | notation
    const model = options.encoding || options.model || 'o200k_base';
    const maxTokens = options.maxTokens && options.maxTokens > 0 ? options.maxTokens : null;

    if (!rawText || !rawText.trim()) {
      return buildCompileReport('', '', model, [], false, startMs, { mode });
    }

    const tokensBefore = countTokens(rawText, model);
    const stages = new Set();

    // Fast path: Pure JSON payload -> Lossless Structural Codec
    const trimmed = rawText.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === 'object') {
          const tabular = encodeStructured(parsed);
          const isTabular = tabular.startsWith('@table') || tabular.startsWith('@struct{');
          const candidate = isTabular ? tabular : JSON.stringify(parsed);
          const candToks = countTokens(candidate, model);

          let best = rawText;
          let bestToks = tokensBefore;
          let reversibleStructured = false;

          if (candToks < bestToks) {
            best = candidate;
            bestToks = candToks;
            stages.add(isTabular ? 'structural_tabular' : 'json_minify');
            reversibleStructured = true;
          } else if (isTabular) {
            const minified = JSON.stringify(parsed);
            const minToks = countTokens(minified, model);
            if (minToks < bestToks) {
              best = minified;
              bestToks = minToks;
              stages.add('json_minify');
              reversibleStructured = true;
            }
          }

          let truncated = false;
          if (maxTokens && bestToks > maxTokens) {
            const fitted = hardFitToBudget(best, maxTokens, model);
            best = fitted.text;
            bestToks = countTokens(best, model);
            truncated = fitted.truncated;
            reversibleStructured = false;
            stages.add('hard_budget_fit');
          }
          return buildCompileReport(rawText, best, model, stages, truncated, startMs, {
            mode,
            reversibleStructured,
            tokensBefore,
            tokensAfter: bestToks,
          });
        }
      } catch (_) {
        // Fall through to prose/mixed pipeline
      }
    }

    // Explicit Notation Mode (DSL shorthand without consonant skeletons, negation-safe)
    if (mode === 'notation') {
      const notation = compileNotation(rawText, options.customVocab, { encoding: model });
      if (notation) {
        const notationToks = countTokens(notation, model);
        if (notationToks <= tokensBefore) {
          stages.add('notation_dsl');
          let out = notation;
          let truncated = false;
          if (maxTokens && notationToks > maxTokens) {
            const fitted = hardFitToBudget(out, maxTokens, model);
            out = fitted.text;
            truncated = fitted.truncated;
          }
          return buildCompileReport(rawText, out, model, stages, truncated, startMs, { mode });
        }
      }
      // Monotonicity guard fallback to balanced prose if notation did not save BPE tokens
    }

    // Stage 1: Atomic protection & embedded JSON codec
    const { working, preserves, stages: segStages } = protectSegments(rawText, { encoding: model });
    for (const s of segStages) stages.add(s);

    // Stage 2: Repetitive log folding
    const logRes = foldRepetitiveLogs(working);
    let processed = logRes.text;
    if (logRes.folded) stages.add('log_folding');

    // Apply custom vocabulary replacements safely outside protected blocks
    if (options.customVocab) {
      const vocab = normalizeCustomVocab(options.customVocab);
      const sorted = Object.entries(vocab).sort((a, b) => String(b[1]).length - String(a[1]).length);
      for (const [key, val] of sorted) {
        if (typeof val === 'string' && val.length > 0 && countTokens(key, model) < countTokens(val, model)) {
          const escaped = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const next = processed.replace(new RegExp(escaped, 'gi'), key);
          if (next !== processed) {
            processed = next;
            stages.add('custom_vocab');
          }
        }
      }
    }

    // Stage 3: Phatic & verbose discourse cleanup
    const afterPhatic = stripPhaticNoise(processed, mode === 'lossless' ? 'lossless' : mode);
    if (afterPhatic !== processed) {
      processed = afterPhatic;
      stages.add('phatic_strip');
    }

    // Stage 4: Exact & near-duplicate sentence deduplication
    const units = splitSemanticUnits(processed);
    const dedupRes = deduplicateUnits(units, mode === 'lossless' ? 'lossless' : mode);
    if (dedupRes.removed > 0) {
      stages.add('shingle_dedup');
    }

    // Stage 5: Query-aware extractive selection (BM25 + Polarity Lock + Knapsack)
    let selectedUnits = dedupRes.units;
    let truncated = false;
    if (mode !== 'lossless' || maxTokens) {
      const extRes = extractiveSelect(selectedUnits, preserves, {
        mode,
        query: options.query || '',
        maxTokens,
        targetRatio: options.targetRatio,
        focusTerms: options.focusTerms,
        encoding: model,
      });
      selectedUnits = extRes.units;
      if (extRes.pruned) {
        stages.add('extractive_bm25');
        truncated = extRes.truncated;
      }
    }

    let compiled = restoreSegments(joinUnits(selectedUnits), preserves).trim();

    // Stage 6: Strict BPE Monotonicity Guard + Hard Budget Enforcement
    let monotonicFallback = false;
    let tokensAfter = countTokens(compiled, model);
    if (tokensAfter > tokensBefore) {
      compiled = rawText;
      tokensAfter = tokensBefore;
      monotonicFallback = true;
      stages.clear();
      stages.add('monotonicity_rollback');
    }

    if (maxTokens && tokensAfter > maxTokens) {
      const fitted = hardFitToBudget(compiled, maxTokens, model);
      compiled = fitted.text;
      tokensAfter = countTokens(compiled, model);
      truncated = truncated || fitted.truncated;
      stages.add('hard_budget_fit');
    }

    return buildCompileReport(rawText, compiled, model, stages, truncated, startMs, {
      mode,
      monotonicFallback,
      tokensBefore,
      tokensAfter,
    });
  }

  // ============================================================================
  // 10. CACHE-AWARE PROMPT COMPRESSION (CAPC) FOR MULTI-TURN MESSAGE ARRAYS
  // ============================================================================
  const PROVIDER_PROFILES = {
    anthropic: {
      name: 'anthropic',
      encoding: 'cl100k_base',
      cacheFloorTokens: 1024,
      inputUsdPer1M: 3.0,
      cacheReadUsdPer1M: 0.3,
      cacheWriteUsdPer1M: 3.75,
    },
    openai: {
      name: 'openai',
      encoding: 'o200k_base',
      cacheFloorTokens: 1024,
      inputUsdPer1M: 2.5,
      cacheReadUsdPer1M: 1.25,
      cacheWriteUsdPer1M: 2.5,
    },
    gemini: {
      name: 'gemini',
      encoding: 'cl100k_base',
      cacheFloorTokens: 2048,
      inputUsdPer1M: 1.25,
      cacheReadUsdPer1M: 0.3125,
      cacheWriteUsdPer1M: 1.25,
    },
    deepseek: {
      name: 'deepseek',
      encoding: 'cl100k_base',
      cacheFloorTokens: 1024,
      inputUsdPer1M: 0.27,
      cacheReadUsdPer1M: 0.07,
      cacheWriteUsdPer1M: 0.27,
    },
  };

  function compileMessages(messages, options = {}) {
    if (!Array.isArray(messages)) {
      throw new TypeError('compileMessages expects an array of { role, content } objects.');
    }
    const providerKey = String(options.provider || 'openai').toLowerCase();
    const profile = PROVIDER_PROFILES[providerKey] || PROVIDER_PROFILES.openai;
    const encoding = options.encoding || profile.encoding;
    const mode = options.mode || 'balanced';
    const cacheHitRate = typeof options.cacheHitRate === 'number' ? Math.max(0, Math.min(1, options.cacheHitRate)) : 0.85;
    const requestsPerBatch = options.requestsPerBatch || 1000;

    // Identify latest user query for query-aware dynamic compression (NEVER leaks into Tier 0!)
    let activeQuery = options.query || '';
    if (!activeQuery) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i] && messages[i].role === 'user' && typeof messages[i].content === 'string') {
          activeQuery = messages[i].content.slice(0, 400);
          break;
        }
      }
    }

    // Partition contiguous leading static prefix (Tier 0: system/developer/explicit cacheable)
    let staticBoundaryIdx = -1;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const isStatic = m && (m.role === 'system' || m.role === 'developer' || m.cacheable === true);
      if (isStatic && i === staticBoundaryIdx + 1) {
        staticBoundaryIdx = i;
      } else {
        break;
      }
    }

    const compiledMessages = [];
    let rawStaticTokens = 0;
    let compStaticTokens = 0;
    let rawDynamicTokens = 0;
    let compDynamicTokens = 0;
    const staticTextParts = [];
    const perMessageAudit = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg.content !== 'string') {
        compiledMessages.push({ ...msg });
        continue;
      }
      const isTier0 = i <= staticBoundaryIdx;
      const msgReport = isTier0
        ? compile(msg.content, {
            // Tier 0 MUST be 100% query-agnostic to guarantee stable KV-cache prefix hash!
            mode: 'lossless',
            encoding,
            customVocab: options.customVocab,
          })
        : compile(msg.content, {
            mode,
            encoding,
            query: i < messages.length - 1 ? activeQuery : '',
            maxTokens: options.maxDynamicTokensPerMessage || null,
            customVocab: options.customVocab,
          });

      const outMsg = { ...msg, content: msgReport.text };
      delete outMsg.cacheable;

      if (isTier0) {
        rawStaticTokens += msgReport.tokensBefore;
        compStaticTokens += msgReport.tokensAfter;
        staticTextParts.push(`${msg.role}:${msgReport.text}`);
      } else {
        rawDynamicTokens += msgReport.tokensBefore;
        compDynamicTokens += msgReport.tokensAfter;
      }

      compiledMessages.push(outMsg);
      perMessageAudit.push({
        index: i,
        role: msg.role,
        tier: isTier0 ? 'static_tier0' : 'dynamic_tier2',
        tokensBefore: msgReport.tokensBefore,
        tokensAfter: msgReport.tokensAfter,
        savingsPct: msgReport.savingsPct,
        stagesApplied: msgReport.stagesApplied,
      });
    }

    const prefixHash = sha256Hex(staticTextParts.join('\n---\n'));
    const cacheEligible = staticBoundaryIdx >= 0 && compStaticTokens >= profile.cacheFloorTokens;

    if (cacheEligible && providerKey === 'anthropic') {
      compiledMessages[staticBoundaryIdx].cache_control = { type: 'ephemeral' };
    }

    // Economic model (CAPC — Two-Tier Cost per requestsPerBatch calls)
    const rawTotal = rawStaticTokens + rawDynamicTokens;
    const compTotal = compStaticTokens + compDynamicTokens;
    const perTokenInput = profile.inputUsdPer1M / 1e6;
    const perTokenCacheRead = profile.cacheReadUsdPer1M / 1e6;
    const perTokenCacheWrite = profile.cacheWriteUsdPer1M / 1e6;

    const rawUncachedUsd = Number((rawTotal * perTokenInput * requestsPerBatch).toFixed(6));

    const rawCacheEligible = staticBoundaryIdx >= 0 && rawStaticTokens >= profile.cacheFloorTokens;
    const rawCachedStaticPerReq = rawCacheEligible
      ? rawStaticTokens * (cacheHitRate * perTokenCacheRead + (1 - cacheHitRate) * perTokenCacheWrite)
      : rawStaticTokens * perTokenInput;
    const rawCachedUsd = Number(((rawCachedStaticPerReq + rawDynamicTokens * perTokenInput) * requestsPerBatch).toFixed(6));

    const capcStaticPerReq = cacheEligible
      ? compStaticTokens * (cacheHitRate * perTokenCacheRead + (1 - cacheHitRate) * perTokenCacheWrite)
      : compStaticTokens * perTokenInput;
    const capcSteadyStateUsd = Number(((capcStaticPerReq + compDynamicTokens * perTokenInput) * requestsPerBatch).toFixed(6));

    const totalSaved = Math.max(0, rawTotal - compTotal);
    const savingsPct = rawTotal > 0 ? Number(((totalSaved / rawTotal) * 100).toFixed(2)) : 0;

    return {
      version: VERSION,
      provider: profile.name,
      messages: compiledMessages,
      cache: {
        prefixHash,
        staticBoundaryIndex: staticBoundaryIdx,
        staticTokensBefore: rawStaticTokens,
        staticTokensAfter: compStaticTokens,
        floorTokens: profile.cacheFloorTokens,
        eligible: cacheEligible,
      },
      metrics: {
        totalTokensBefore: rawTotal,
        totalTokensAfter: compTotal,
        tokensSaved: totalSaved,
        savingsPct,
        dynamicTokensBefore: rawDynamicTokens,
        dynamicTokensAfter: compDynamicTokens,
      },
      economics: {
        requestsPerBatch,
        cacheHitRate,
        rawUncachedUsd,
        rawCachedUsd,
        capcSteadyStateUsd,
        capcSavingsVsRawPct: rawUncachedUsd > 0 ? Number((((rawUncachedUsd - capcSteadyStateUsd) / rawUncachedUsd) * 100).toFixed(2)) : 0,
        capcSavingsVsCachedPct: rawCachedUsd > 0 ? Number((((rawCachedUsd - capcSteadyStateUsd) / rawCachedUsd) * 100).toFixed(2)) : 0,
      },
      audit: perMessageAudit,
    };
  }

  // Backward-compatible synchronous helper used by legacy callers / CLI / extensions
  function compressLocally(text, customVocab, options = {}) {
    if (!text || typeof text !== 'string') return '';
    if (!text.trim()) return '';
    const mode = options.mode || 'auto';
    if (mode === 'notation') {
      return compile(text, { ...options, mode: 'notation', customVocab }).text;
    }
    const res = compile(text, { ...options, mode: mode === 'auto' ? 'balanced' : mode, customVocab });
    return res.text;
  }

  return {
    VERSION,
    ACTIONS,
    LANGUAGES,
    FRAMEWORKS,
    STRUCTURES,
    MODIFIERS,
    PROVIDER_PROFILES,
    countTokens,
    getTokenizerMetadata,
    sha256Hex,
    encodeStructured,
    decodeStructured,
    compile,
    compileMessages,
    compressLocally,
    expand,
  };
});
