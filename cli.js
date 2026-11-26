#!/usr/bin/env node
/**
 * TokLang v2.0 CLI — Deterministic BPE-Verified & Cache-Aware Prompt Compiler
 */

const fs = require('fs');
const path = require('path');
const TokLangEngine = require('./js/toklang-engine');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
TokLang CLI v${TokLangEngine.VERSION} — Deterministic BPE & Cache-Aware Prompt Compiler

Usage:
  toklang <action> [input] [options]

Actions:
  compile "<text>"         Compile/compress text or JSON payload offline (alias: compress)
  expand "<text>"          Decode @table/@struct back to JSON or expand TokLang notation (alias: decode)
  file <path>              Read a file (.txt, .md, .json, .log) and compile it
  messages <json-path>     Run Cache-Aware Prompt Compression (CAPC) over a messages[] JSON file

Options:
  --mode <mode>            lossless | balanced (default) | aggressive | notation
  --max-tokens <n>         Hard BPE token budget for extractive compilation
  --query "<text>"         Focus query for query-aware BM25 extraction
  --encoding <name>        o200k_base (default) | cl100k_base
  --provider <name>        openai | anthropic | gemini | deepseek (for messages action)
  --vocab <path>           Load custom JSON vocabulary file
  --out <path>             Write compiled output to file
  --json                   Emit full machine-readable telemetry JSON
`);
}

function getFlagValue(flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return null;
}

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const action = args[0];
const inputArg = args[1];
const mode = getFlagValue('--mode') || 'balanced';
const maxTokensRaw = getFlagValue('--max-tokens');
const maxTokens = maxTokensRaw ? Number(maxTokensRaw) : null;
const query = getFlagValue('--query') || '';
const encoding = getFlagValue('--encoding') || 'o200k_base';
const provider = getFlagValue('--provider') || 'openai';
const vocabPath = getFlagValue('--vocab');
const outputPath = getFlagValue('--out');
const asJson = args.includes('--json');

let customVocab = null;
if (vocabPath) {
  try {
    customVocab = JSON.parse(fs.readFileSync(path.resolve(vocabPath), 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed reading vocab file: ${err.message}`);
    process.exit(1);
  }
}

if (!['compile', 'compress', 'expand', 'decode', 'file', 'messages'].includes(action)) {
  console.error(`[ERROR] Unknown action "${action}".`);
  showHelp();
  process.exit(1);
}

if (!inputArg) {
  console.error('[ERROR] Input text or file path is required.');
  process.exit(1);
}

if (action === 'compile' || action === 'compress' || action === 'file') {
  const source = action === 'file' ? fs.readFileSync(path.resolve(inputArg), 'utf8') : inputArg;
  const report = TokLangEngine.compile(source, {
    mode,
    maxTokens,
    query,
    encoding,
    customVocab,
  });

  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), report.text, 'utf8');
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[OK] TokLang v${report.version} | mode=${report.mode} | ${report.tokenizer.source}`);
    console.log(
      `Tokens: ${report.tokensBefore} -> ${report.tokensAfter} (-${report.tokensSaved} / -${report.savingsPct}%) | ` +
      `Prefill FLOPs: -${report.attentionFlopsReductionPct}% | Negations: ${Math.round(report.audit.negationsPreservedRatio * 100)}% | ` +
      `Latency: ${report.latencyMs}ms`
    );
    console.log(`Stages: ${report.stagesApplied.join(', ') || 'none'} | SHA-256: ${report.prefixHash.slice(0, 16)}`);
    console.log('---');
    console.log(report.text);
  }
} else if (action === 'expand' || action === 'decode') {
  const res = TokLangEngine.expand(inputArg, customVocab);
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), res, 'utf8');
  }
  console.log(res);
} else if (action === 'messages') {
  const payload = JSON.parse(fs.readFileSync(path.resolve(inputArg), 'utf8'));
  const messages = Array.isArray(payload) ? payload : payload.messages;
  const report = TokLangEngine.compileMessages(messages, {
    provider,
    mode,
    encoding,
    customVocab,
  });
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), JSON.stringify(report.messages, null, 2), 'utf8');
  }
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[OK] TokLang CAPC v${report.version} | provider=${report.provider}`);
    console.log(
      `Tokens: ${report.metrics.totalTokensBefore} -> ${report.metrics.totalTokensAfter} (-${report.metrics.savingsPct}%) | ` +
      `Cache eligible: ${report.cache.eligible} | Prefix SHA-256: ${report.cache.prefixHash.slice(0, 16)}`
    );
    console.log(
      `Cost per ${report.economics.requestsPerBatch} reqs: Raw $${report.economics.rawUncachedUsd} | ` +
      `Raw+Cache $${report.economics.rawCachedUsd} | CAPC $${report.economics.capcSteadyStateUsd} ` +
      `(-${report.economics.capcSavingsVsRawPct}% vs raw, -${report.economics.capcSavingsVsCachedPct}% vs cached)`
    );
  }
}
