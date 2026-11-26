# TokLang Python SDK v2.0

Deterministic, BPE-verified, negation-safe, and Cache-Aware (CAPC) prompt compiler for Python 3.10+.

## Install

```bash
pip install -e .
# Optional exact BPE tokenization via tiktoken:
pip install -e ".[bpe]"
```

## Quickstart

```python
from toklang import compile_prompt, compile_messages, encode_structured, decode_structured, TokLangMiddleware

# 1. Lossless structural tabular compression (roundtrip bit-for-bit)
encoded = encode_structured({"users": [{"id": 1, "name": "Alice", "active": True}, {"id": 2, "name": "Bob", "active": False}]})
restored = decode_structured(encoded)

# 2. Negation-safe & BM25 extractive compilation under hard token budget
report = compile_prompt(long_rag_text, mode="balanced", query="quorum Raft", max_tokens=220)

# 3. Cache-Aware Prompt Compression (CAPC) for multi-turn messages
capc = compile_messages(messages, provider="anthropic", mode="balanced")
print(capc["cache"]["prefix_hash"], capc["economics"])
```
