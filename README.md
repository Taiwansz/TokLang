# TokLang v2.0

[Portugues](#portugues) | [English](#english)

---

<a name="portugues"></a>
## Portugues

> **Compilador Deterministico de Contexto para LLMs — BPE-Verificado, Negation-Safe e Cache-Aware (CAPC).**

### O que mudou na v2.0 (Reformulado a partir de Primeiros Principios)

A v1 operava com abreviacoes consonantais, listas de stopwords que removiam negacoes, teto de 800 caracteres e fallback para LLMs externos. Em 2026, com tokenizadores BPE modernos (`o200k_base` / `cl100k_base`) e **Prompt Caching nativo**, essa abordagem frequentemente infla sub-tokens e destroi a taxa de acerto de cache.

O **TokLang v2.0** substitui heuristicas frageis por um compilador deterministico offline (JS + Python + CLI + API) em 6 estagios:

1. **Protecao Atomica de Segmentos:** Blocos de codigo (` ``` `), inline code, SQL/DDL, exemplos few-shot e operadores logicos sao isolados antes de qualquer poda.
2. **Codec Estrutural Lossless (`@table` / `@struct`, estilo TOON):** Serializa arrays JSON uniformes (tool outputs, respostas MCP, resultados SQL) declarando o schema uma unica vez, com roundtrip bit-a-bit via `decodeStructured()`.
3. **Log Folding & Deduplicacao por Shingles:** Compacta rajadas repetitivas de logs (`[xN]`) e elimina trechos redundantes de RAG sem perder clausulas negativas.
4. **Polarity & Negation Lock:** Operadores de negacao e restricao (`nao`, `sem`, `nunca`, `jamais`, `exceto`, `not`, `never`, `without`, `only`, `!=`, `<=`) possuem trava inviolavel em 100% dos modos.
5. **Poda Extrativa Query-Aware (BM25 + Entropia + Knapsack):** Compila documentos RAG extensos sob `maxTokens` estrito sem truncamento cego nem chamadas a LLM externo.
6. **Cache-Aware Prompt Compression (CAPC):** `compileMessages()` separa o prefixo estatico (Tier 0, comprimido de forma 100% query-agnostic com hash SHA-256 imutavel e `cache_control`) do contexto dinamico (Tier 2), somando economia estrutural ao desconto do Prompt Caching.
7. **Guarda de Monotonicidade BPE:** Mede cada transformacao em `js-tiktoken` (`o200k_base` / `cl100k_base`) e executa rollback automatico caso `tokensAfter > tokensBefore`.

### Benchmark Reproduzivel (BPE Real `o200k_base` via `js-tiktoken`)

Reproduza localmente com `npm run benchmark` (artefato auditavel salvo em `benchmark/results_v2.json`):

| Caso | Workload Real | BPE Antes | BPE Depois | Corte BPE | Prefill FLOPs | Invariante Verificada |
|---|---|---:|---:|---:|---:|---|
| W1 | JSON / MCP Uniforme (25 registros) | 1.610 | 645 | **-59.9%** | -84.0% | Roundtrip lossless 100% |
| W2 | Tool Response Hibrido (`@struct` + 20 pedidos) | 1.002 | 395 | **-60.6%** | -84.5% | Roundtrip lossless 100% |
| W3 | RAG Longo (Consenso Raft, budget 220 tok) | 664 | 86 | **-87.0%** | -98.3% | `floor(N/2)+1` + `nunca` preservados |
| W4 | SQL CTE + Bloco Codigo + JSON embutido | 445 | 234 | **-47.4%** | -72.3% | SQL verbatim + `@table` + `nao` |
| W5 | Auditoria Regulatoria LGPD (negacoes densas) | 128 | 80 | **-37.5%** | -60.9% | 100% negacoes unicas preservadas |
| W6 | Logs Repetitivos de Producao (60 linhas) | 1.297 | 134 | **-89.7%** | -98.9% | Dobramento `[x28]` e `[x20]` |
| W7 | Prompt Curto Tecnico (com negacoes) | 52 | 42 | **-19.2%** | -34.8% | Zero esqueleto consonantal |

#### Economia CAPC Multi-Turn (W8 — 1.000 requisicoes, 85% cache hit, prefixo estatico SHA-256 100% estavel)

| Provedor | Raw Sem Cache | Raw + Prompt Cache | TokLang v2 CAPC | Economia vs Raw | Economia Adicional vs Cache |
|---|---:|---:|---:|---:|---:|
| Anthropic | $8.874 | $4.315 | **$2.563** | **-71.12%** | **-40.60%** |
| OpenAI | $6.903 | $4.910 | **$3.408** | **-50.63%** | **-30.60%** |

Latencia offline global (apos warm-up do encoder): **p50 = 3.22 ms**, **p95 = 6.35 ms**.

### Uso Rapido

```bash
npm install
npm run test:core      # Suite TDD Core v2 (node:test)
npm run test:unit      # Suite unitaria & CAPC middleware
npm run test:py        # Suite Python SDK v2 (pytest)
npm run benchmark      # Benchmark BPE real + gate de falseabilidade
npm start              # Web Workbench Industrial Pop em http://localhost:5500
```

```js
const { TokLang, TokLangMiddleware } = require('./js/sdk-lib');

const compiler = new TokLang();
const report = compiler.compile(payloadOrRag, {
  mode: 'balanced',
  query: 'quorum Raft',
  maxTokens: 220,
  encoding: 'o200k_base',
});

const client = new TokLangMiddleware({
  target: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

```python
from toklang import compile_prompt, compile_messages, decode_structured

report = compile_prompt(payload, mode="lossless")
restored = decode_structured(report["text"])
capc = compile_messages(messages, provider="anthropic", mode="balanced")
```

---

<a name="english"></a>
## English

> **Deterministic, BPE-Verified, Negation-Safe, and Cache-Aware (CAPC) Context Compiler for LLMs.**

### Why TokLang v2.0

Naive v1 prompt compressors broke real BPE tokenization with out-of-vocabulary consonant abbreviations, dropped logical negations in stopword lists, and invalidated provider KV-cache prefixes. TokLang v2.0 is rebuilt from first principles as a zero-LLM-call deterministic compiler (JS + Python SDK + CLI + REST API + Web Workbench):

- **Lossless Structural Tabular Codec (`@table` / `@struct`):** Compresses uniform JSON/MCP/tool payloads by **59.9% to 60.6%** in real `o200k_base` BPE tokens with verified 100% bit-for-bit `decodeStructured()` roundtrip.
- **Cache-Aware Prompt Compression (CAPC):** `compileMessages()` isolates static system/schema prefixes (Tier 0, query-agnostic compression, immutable SHA-256 `prefixHash`, automatic Anthropic `cache_control`) from dynamic tool/RAG payloads (Tier 2), reducing total spend by **30.6% to 40.6% beyond standalone Prompt Caching**.
- **Polarity & Negation Lock:** Guarantees 100% retention of PT-BR and EN negation/constraint operators (`not`, `never`, `without`, `only`, `nao`, `sem`, `nunca`, `!=`, `<=`).
- **Strict BPE Monotonicity Guard:** Every transformation is checked against real BPE counts (`tokensAfter <= tokensBefore`), rolling back automatically if a transform fails to save tokens.
- **Reproducible Benchmark & Falsifiability Gate:** Run `npm run benchmark` to verify every number locally against `js-tiktoken` (`p50 = 3.22 ms`, `p95 = 6.35 ms`).

### License

Released under the MIT License.
