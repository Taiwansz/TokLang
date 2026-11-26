"""TokLang v2.0 Python SDK — Deterministic, BPE-Verified, Negation-Safe, Cache-Aware Prompt Compiler."""

from __future__ import annotations

import hashlib
import json
import math
import re
import time
import unicodedata
import urllib.request
from typing import Any

VERSION = "2.0.0"

try:
    import tiktoken as _tiktoken  # type: ignore
except ImportError:
    _tiktoken = None

_ENCODER_CACHE: dict[str, Any] = {}

ACTIONS: dict[str, str] = {
    "cr": "Crie",
    "fix": "Corrija o bug em",
    "ex": "Explique",
    "rf": "Refatore",
    "op": "Otimize",
    "tst": "Escreva testes para",
    "doc": "Documente",
    "cv": "Converta",
    "rev": "Revise o código de",
    "sum": "Resuma",
}

LANGUAGES: dict[str, str] = {
    "py": "Python", "js": "JavaScript", "ts": "TypeScript", "sql": "SQL",
    "go": "Go", "rs": "Rust", "sh": "Shell / Bash", "css": "CSS",
    "java": "Java", "rb": "Ruby", "cs": "C#", "cpp": "C++",
    "php": "PHP", "kt": "Kotlin", "swift": "Swift", "html": "HTML",
}

FRAMEWORKS: dict[str, str] = {
    "streamlit": "Streamlit", "fastapi": "FastAPI", "flask": "Flask",
    "django": "Django", "pandas": "Pandas", "plt": "Matplotlib / Plotly",
    "numpy": "NumPy", "react": "React", "next": "Next.js", "vue": "Vue.js",
    "express": "Express.js", "nest": "NestJS", "prisma": "Prisma ORM",
    "drizzle": "Drizzle ORM", "pg": "PostgreSQL", "mongo": "MongoDB",
    "redis": "Redis", "supabase": "Supabase", "docker": "Docker",
    "jest": "Jest", "vitest": "Vitest", "playwright": "Playwright",
    "tailwind": "Tailwind CSS", "jwt": "JWT",
}

STRUCTURES: dict[str, str] = {
    "fn": "função", "cls": "classe", "scr": "script", "api": "API",
    "comp": "componente", "hook": "hook customizado", "mod": "módulo", "mw": "middleware",
}

MODIFIERS: dict[str, str] = {
    "ui+": "com interface visual bonita e estilizada",
    "prd": "pronto para produção (seguindo as melhores práticas)",
    "cm": "com comentários explicativos no código",
    "dk": "com exemplos práticos de uso",
    "typ": "com tipagem estática/anotações de tipo",
    "async": "usando implementação assíncrona",
    "min": "versão minimalista/simples (sem dependências extras)",
    "*": "com máxima qualidade possível",
}

PROVIDER_PROFILES: dict[str, dict[str, Any]] = {
    "anthropic": {
        "name": "anthropic",
        "encoding": "cl100k_base",
        "cache_floor_tokens": 1024,
        "input_usd_per_1m": 3.0,
        "cache_read_usd_per_1m": 0.3,
        "cache_write_usd_per_1m": 3.75,
    },
    "openai": {
        "name": "openai",
        "encoding": "o200k_base",
        "cache_floor_tokens": 1024,
        "input_usd_per_1m": 2.5,
        "cache_read_usd_per_1m": 1.25,
        "cache_write_usd_per_1m": 2.5,
    },
    "gemini": {
        "name": "gemini",
        "encoding": "cl100k_base",
        "cache_floor_tokens": 2048,
        "input_usd_per_1m": 1.25,
        "cache_read_usd_per_1m": 0.3125,
        "cache_write_usd_per_1m": 1.25,
    },
    "deepseek": {
        "name": "deepseek",
        "encoding": "cl100k_base",
        "cache_floor_tokens": 1024,
        "input_usd_per_1m": 0.27,
        "cache_read_usd_per_1m": 0.07,
        "cache_write_usd_per_1m": 0.27,
    },
}

_NEGATION_RE = re.compile(
    r"\b(n[aã]o|nem|nunca|jamais|sem|exceto|proibid[oa]s?|evit[ae]r?|apenas|somente|"
    r"not|never|nor|without|except|only|forbidden|prohibited|avoid|cannot|can't|don't|"
    r"doesn't|didn't|won't|mustn't|shouldn't)\b|!=|!==|<>|<=|>=",
    re.IGNORECASE,
)

_RANKING_STOPWORDS = {
    "a", "o", "e", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
    "para", "por", "com", "um", "uma", "que", "se", "como", "mais", "mas", "ou",
    "ao", "aos", "as", "os", "the", "and", "for", "that", "this", "with", "from",
    "are", "was", "were", "have", "has", "had", "been", "into", "about",
}

_SAFE_NOTATION_STOPWORDS = {
    "um", "uma", "uns", "umas", "o", "a", "os", "as", "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas", "por", "pelo", "pela", "para", "pra", "pro", "com",
    "que", "qual", "quais", "como", "eu", "me", "meu", "minha", "seu", "sua",
    "este", "esta", "esse", "essa", "isso", "isto", "e", "ou", "mas", "porque", "pois",
    "muito", "bem", "ja", "já", "ainda", "tambem", "também", "ser", "estar", "ter", "ir",
    "poder", "querer", "ficar", "é", "foi", "está", "esta", "tem", "vai", "vou", "pode",
    "quero", "preciso", "gostaria", "poderia", "favor", "ajuda", "ajudar", "ajude",
    "usar", "usando", "utilizar", "utilizando", "use", "forma", "modo", "jeito",
    "código", "codigo", "code", "the", "a", "an", "is", "are", "to", "for", "with",
    "of", "in", "on", "and", "please", "help", "using", "want", "need", "like",
}


def _strip_accents(text: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
    )


def resolve_encoding_name(model_or_encoding: str = "o200k_base") -> str:
    key = (model_or_encoding or "o200k_base").lower()
    if key == "o200k_base" or "gpt-4o" in key or "gpt-4.1" in key or "gpt-5" in key:
        return "o200k_base"
    if any(k in key for k in ("cl100k_base", "claude", "llama", "deepseek", "gemini", "gpt-4")):
        return "cl100k_base"
    return "o200k_base"


def _get_bpe_encoder(model_or_encoding: str = "o200k_base") -> Any:
    if _tiktoken is None:
        return None
    enc_name = resolve_encoding_name(model_or_encoding)
    if enc_name not in _ENCODER_CACHE:
        try:
            _ENCODER_CACHE[enc_name] = _tiktoken.get_encoding(enc_name)
        except Exception:
            return None
    return _ENCODER_CACHE[enc_name]


def count_tokens(text: str, model_or_encoding: str = "o200k_base") -> int:
    if not text or not isinstance(text, str):
        return 0
    enc = _get_bpe_encoder(model_or_encoding)
    if enc is not None:
        return len(enc.encode(text))

    chunks = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ_]+|[0-9]{1,3}|\s+|[^\sA-Za-zÀ-ÖØ-öø-ÿ0-9_]", text)
    total = 0.0
    for c in chunks:
        if c.isspace():
            if "\n" in c:
                total += c.count("\n")
            elif len(c) > 2:
                total += math.ceil(len(c) / 4)
        elif c.isdigit():
            total += 1
        elif re.fullmatch(r"[A-Za-z_]+", c):
            total += 1 if len(c) <= 7 else math.ceil(len(c) / 4.6)
        elif re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ_]+", c):
            non_ascii = sum(1 for ch in c if ord(ch) > 127)
            total += max(1, math.ceil((len(c) + non_ascii * 0.65) / 4.2))
        else:
            total += 1
    return max(1, int(round(total))) if chunks else 0


def sha256_hex(text: str) -> str:
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()


# ============================================================================
# Lossless Structural Codec (TOON-compatible schema-hoisted @table / @struct)
# ============================================================================
def _is_primitive(val: Any) -> bool:
    return val is None or isinstance(val, (str, int, float, bool))


def _is_uniform_primitive_array(arr: Any) -> bool:
    if not isinstance(arr, list) or len(arr) < 2:
        return False
    keys_set: set[str] = set()
    populated = 0
    for row in arr:
        if not isinstance(row, dict) or not row:
            return False
        for k, v in row.items():
            if not isinstance(k, str) or re.search(r"[{},\n\r:]", k):
                return False
            if not _is_primitive(v):
                return False
            keys_set.add(k)
        populated += len(row)
    return bool(keys_set) and (populated / (len(arr) * len(keys_set))) >= 0.7


_NUM_RE = re.compile(r"^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$")


def _encode_tabular_cell(val: Any) -> str:
    if val is None:
        return "null"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val) if math.isfinite(val) else "null"
    s = str(val)
    needs_quotes = (
        s == ""
        or s != s.strip()
        or s in ("null", "true", "false", "__UNDEF__")
        or bool(_NUM_RE.match(s))
        or bool(re.search(r'[|\n\r"\\]', s))
    )
    return json.dumps(s, ensure_ascii=False) if needs_quotes else s


def _decode_tabular_cell(raw: str) -> Any:
    if raw == "__UNDEF__":
        return _MISSING
    if raw == "null":
        return None
    if raw == "true":
        return True
    if raw == "false":
        return False
    if raw.startswith('"') and raw.endswith('"'):
        return json.loads(raw)
    if _NUM_RE.match(raw):
        return float(raw) if ("." in raw or "e" in raw.lower()) else int(raw)
    return raw


class _MissingSentinel:
    pass


_MISSING = _MissingSentinel()


def _split_tabular_row(line: str) -> list[str]:
    cells: list[str] = []
    cur: list[str] = []
    in_quotes = False
    escaped = False
    for ch in line:
        if in_quotes:
            cur.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_quotes = False
        elif ch == '"':
            in_quotes = True
            cur.append(ch)
        elif ch == "|":
            cells.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    cells.append("".join(cur))
    return cells


def _format_table_block(name: str, arr: list[dict[str, Any]]) -> str:
    cols: list[str] = []
    seen: set[str] = set()
    for row in arr:
        for k in row.keys():
            if k not in seen:
                seen.add(k)
                cols.append(k)
    header = (
        f"@table {name}[{len(arr)}]{{{','.join(cols)}}}:"
        if name
        else f"@table[{len(arr)}]{{{','.join(cols)}}}:"
    )
    lines = [header]
    for row in arr:
        cells = [
            _encode_tabular_cell(row[c]) if c in row else "__UNDEF__"
            for c in cols
        ]
        lines.append("|".join(cells))
    return "\n".join(lines)


def encode_structured(value: Any) -> str:
    parsed = json.loads(value) if isinstance(value, str) else value
    if _is_uniform_primitive_array(parsed):
        return _format_table_block("", parsed)
    if isinstance(parsed, dict):
        keys = list(parsed.keys())
        if len(keys) == 1 and _is_uniform_primitive_array(parsed[keys[0]]):
            return _format_table_block(keys[0], parsed[keys[0]])
        if any(_is_uniform_primitive_array(parsed[k]) for k in keys):
            lines = ["@struct{"]
            for k in keys:
                if _is_uniform_primitive_array(parsed[k]):
                    lines.append(_format_table_block(k, parsed[k]))
                else:
                    lines.append(f"@kv {k}: {json.dumps(parsed[k], ensure_ascii=False, separators=(',', ':'))}")
            lines.append("}")
            return "\n".join(lines)
    return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))


def _parse_table_lines(header: str, body: list[str]) -> tuple[str, list[dict[str, Any]], int]:
    m = re.match(r"^@table(?:\s+([^{\[\s]+))?\[(\d+)\]\{([^}]+)\}:$", header)
    if not m:
        raise ValueError(f"Invalid TokLang @table header: {header}")
    name = m.group(1) or ""
    count = int(m.group(2))
    cols = [c.strip() for c in m.group(3).split(",")]
    rows: list[dict[str, Any]] = []
    for i in range(count):
        if i >= len(body):
            raise ValueError(f"Truncated @table {name}: expected {count} rows, got {i}")
        cells = _split_tabular_row(body[i])
        obj: dict[str, Any] = {}
        for idx, col in enumerate(cols):
            val = _decode_tabular_cell(cells[idx])
            if not isinstance(val, _MissingSentinel):
                obj[col] = val
        rows.append(obj)
    return name, rows, count


def decode_structured(text: str) -> Any:
    if not text or not isinstance(text, str):
        return None
    trimmed = text.strip()
    if trimmed.startswith("@table"):
        lines = trimmed.splitlines()
        name, rows, _ = _parse_table_lines(lines[0], lines[1:])
        return {name: rows} if name else rows
    if trimmed.startswith("@struct{") and trimmed.endswith("}"):
        lines = trimmed.splitlines()[1:-1]
        result: dict[str, Any] = {}
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            if line.startswith("@table"):
                name, rows, consumed = _parse_table_lines(line, lines[i + 1:])
                result[name] = rows
                i += 1 + consumed
            elif line.startswith("@kv "):
                key, val_json = line[4:].split(":", 1)
                result[key.strip()] = json.loads(val_json.strip())
                i += 1
            else:
                i += 1
        return result
    return json.loads(trimmed)


# ============================================================================
# Protection, Log Folding, Phatic Strip, Dedup & Extractive BM25 Knapsack
# ============================================================================
def _dedupe_exact_sentences_for_audit(text: str) -> str:
    seen: set[str] = set()
    kept: list[str] = []
    for part in re.split(r"(?<=[.!?])\s+|\n+", text or ""):
        norm = re.sub(r"\s+", " ", part.strip().lower())
        if norm and norm not in seen:
            seen.add(norm)
            kept.append(part.strip())
    return " ".join(kept)


def _extract_negations(text: str) -> list[str]:
    return [_strip_accents(m.group(0).lower()) for m in _NEGATION_RE.finditer(text or "")]


def _has_negation(text: str) -> bool:
    return bool(_NEGATION_RE.search(text or ""))


def _extract_entities(text: str) -> list[str]:
    found: set[str] = set()
    for pat in (
        r"\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b",
        r"\b[a-z]+_[a-z0-9_]+\b",
        r"\b[a-z]+[A-Z][A-Za-z0-9]+\b",
        r"\b(?:https?://\S+|/[\w./-]+)\b",
        r"\b\d+(?:[.,]\d+)?%?\b",
        r"\b(?:SQL|DDL|RLS|JWT|API|REST|CRUD|LGPD|Raft|Paxos|ACID|floor\([^)]+\))\b",
    ):
        for m in re.findall(pat, text or "", flags=re.IGNORECASE):
            found.add(m)
    return list(found)


def _protect_segments(text: str, encoding: str) -> tuple[str, list[tuple[str, str]], set[str]]:
    preserves: list[tuple[str, str]] = []
    stages: set[str] = set()
    working = text

    def add_preserve(content: str) -> str:
        tok = f"__TL_SEG_{len(preserves)}__"
        preserves.append((tok, content))
        return tok

    working = re.sub(
        r"```[\s\S]*?```",
        lambda m: add_preserve(re.sub(r"[ \t]+\n", "\n", m.group(0))),
        working,
    )
    working = re.sub(r"`[^`\n]+`", lambda m: add_preserve(m.group(0)), working)

    idx = 0
    while idx < len(working):
        ch = working[idx]
        if ch in ("{", "["):
            open_ch, close_ch = ch, ("}" if ch == "{" else "]")
            depth = 1
            j = idx + 1
            in_str = False
            esc = False
            while j < len(working) and depth > 0:
                cur = working[j]
                if in_str:
                    if esc:
                        esc = False
                    elif cur == "\\":
                        esc = True
                    elif cur == '"':
                        in_str = False
                else:
                    if cur == '"':
                        in_str = True
                    elif cur == open_ch:
                        depth += 1
                    elif cur == close_ch:
                        depth -= 1
                j += 1
            if depth == 0:
                candidate = working[idx:j]
                if len(candidate) >= 16:
                    try:
                        parsed = json.loads(candidate)
                        if isinstance(parsed, (dict, list)):
                            raw_t = count_tokens(candidate, encoding)
                            minified = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
                            min_t = count_tokens(minified, encoding)
                            tabular = encode_structured(parsed)
                            tab_t = count_tokens(tabular, encoding)
                            best, best_t, stage = candidate, raw_t, ""
                            if min_t < best_t:
                                best, best_t, stage = minified, min_t, "json_minify"
                            if tab_t < best_t:
                                best, best_t, stage = tabular, tab_t, "structural_tabular"
                            if stage:
                                stages.add(stage)
                            tok = add_preserve(best)
                            working = working[:idx] + tok + working[j:]
                            idx += len(tok)
                            continue
                    except Exception:
                        pass
        idx += 1

    return working, preserves, stages


def _restore_segments(text: str, preserves: list[tuple[str, str]]) -> str:
    out = text
    for tok, content in reversed(preserves):
        out = out.replace(tok, content)
    return out


def _fold_repetitive_logs(text: str) -> tuple[str, bool]:
    lines = text.splitlines()
    if len(lines) < 3:
        return text, False
    out: list[str] = []
    folded = False
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            out.append(line)
            i += 1
            continue
        run = 1
        while i + run < len(lines) and lines[i + run] == line:
            run += 1
        if run >= 3:
            out.append(f"{line} [x{run}]")
            folded = True
        else:
            out.extend([line] * run)
        i += run
    return "\n".join(out), folded


def _strip_phatic_noise(text: str, level: str) -> str:
    out = text
    for pat, rep in (
        (r"^(?:ol[aá]|oi|e a[ií]|fala|salve|hey|hi(?:\s+there)?|hello)[!,.:\s]+", ""),
        (r"^(?:bom dia|boa tarde|boa noite|good morning|good afternoon|good evening)[!,.:\s]+", ""),
        (r"^(?:tudo bem\??|como vai\??)[,.:\s]*", ""),
        (r"\b(?:por favor|por gentileza|se poss[ií]vel|please|kindly)\b[,!:\s]*", " "),
        (r"\b(?:(?:muito\s+)?obrigad[oa](?:\s+desde\s+j[aá])?|valeu|thank you(?:\s+in\s+advance)?|thanks(?:\s+in\s+advance)?)[!,.:\s]*", " "),
        (r"\b(?:voc[eê]\s+poderia|voce\s+pode|voc[eê]\s+pode|vc\s+pode|poderia\s+me\s+ajudar\s+a|pode\s+me\s+ajudar\s+a|gostaria\s+que\s+voc[eê]|could\s+you\s+please|can\s+you\s+help\s+me\s+to)\b\s*", ""),
    ):
        out = re.sub(pat, rep, out, flags=re.IGNORECASE)

    if level in ("balanced", "aggressive"):
        for pat, rep in (
            (r"\bcom o objetivo de\b", "para"),
            (r"\ba fim de\b", "para"),
            (r"\bno que diz respeito a\b", "sobre"),
            (r"\bem rela[cç][aã]o a\b", "sobre"),
            (r"(?:^|(?<=[\s.!?]))[eé]\s+importante\s+ressaltar\s+que[,]?\s*", ""),
            (r"\bvale destacar que\b[,]?\s*", ""),
            (r"\bin order to\b", "to"),
            (r"\bdue to the fact that\b", "because"),
            (r"\bit is important to note that\b[,]?\s*", ""),
        ):
            out = re.sub(pat, rep, out, flags=re.IGNORECASE)

    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r" +\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    out = re.sub(r"^\s*[,;:\-]+\s*", "", out).strip()
    if len(out) > 1 and out[0].islower():
        out = out[0].upper() + out[1:]
    out = re.sub(r"([.!?]\s+)([a-záàâãéêíóôõúç])", lambda m: m.group(1) + m.group(2).upper(), out)
    return out


def _split_units(text: str) -> list[dict[str, Any]]:
    units: list[dict[str, Any]] = []
    for p_idx, para in enumerate(re.split(r"\n{2,}", text)):
        para = para.strip()
        if not para:
            continue
        if "__TL_SEG_" in para or "\n" in para:
            units.append({"text": para, "paragraph_break": p_idx > 0})
            continue
        sents = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9_`__])", para)
        for s_idx, s in enumerate(sents):
            s = s.strip()
            if s:
                units.append({"text": s, "paragraph_break": s_idx == 0 and p_idx > 0})
    return units


def _shingles(text: str, k: int = 3) -> set[str]:
    words = re.sub(r"[^a-z0-9_]+", " ", _strip_accents(text.lower())).split()
    if len(words) < k:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}


def _deduplicate_units(units: list[dict[str, Any]], level: str) -> tuple[list[dict[str, Any]], int]:
    kept: list[dict[str, Any]] = []
    exact_seen: set[str] = set()
    shingle_bank: list[tuple[set[str], str]] = []
    removed = 0
    threshold = 0.68 if level == "aggressive" else 0.78

    for unit in units:
        if "__TL_SEG_" in unit["text"]:
            kept.append(unit)
            continue
        norm = re.sub(r"\s+", " ", unit["text"].lower()).strip()
        if norm in exact_seen:
            removed += 1
            continue
        if level != "lossless" and len(norm) > 35:
            sh = _shingles(norm)
            negs = ",".join(_extract_negations(unit["text"]))
            near_dup = False
            for prev_sh, prev_negs in shingle_bank:
                union = len(sh | prev_sh)
                sim = (len(sh & prev_sh) / union) if union else 0.0
                if sim >= threshold and (not negs or negs == prev_negs):
                    near_dup = True
                    break
            if near_dup:
                removed += 1
                continue
            shingle_bank.append((sh, negs))
        exact_seen.add(norm)
        kept.append(unit)
    return kept, removed


def _join_units(units: list[dict[str, Any]]) -> str:
    out = ""
    for idx, u in enumerate(units):
        if idx == 0:
            out = u["text"]
        else:
            out += ("\n\n" if u["paragraph_break"] else " ") + u["text"]
    return out


def _bm25_terms(text: str) -> list[str]:
    cleaned = re.sub(r"[^a-z0-9_+#]+", " ", _strip_accents((text or "").lower()))
    return [t for t in cleaned.split() if len(t) > 1 and t not in _RANKING_STOPWORDS]


def _extractive_select(
    units: list[dict[str, Any]],
    preserves: list[tuple[str, str]],
    mode: str,
    encoding: str,
    query: str = "",
    max_tokens: int | None = None,
    target_ratio: float | None = None,
    focus_terms: list[str] | None = None,
) -> tuple[list[dict[str, Any]], bool]:
    current_total = count_tokens(_restore_segments(_join_units(units), preserves), encoding)
    budget = max_tokens if (max_tokens and max_tokens > 0) else None
    if not budget and mode == "aggressive" and current_total > 180:
        ratio = max(0.2, min(0.95, target_ratio if target_ratio is not None else 0.65))
        budget = max(80, int(current_total * ratio))
    if not budget or current_total <= budget:
        return units, False

    docs = [_bm25_terms(u["text"]) for u in units]
    n_docs = max(1, len(docs))
    avgdl = (sum(len(d) for d in docs) / n_docs) or 1.0
    df: dict[str, int] = {}
    for d in docs:
        for term in set(d):
            df[term] = df.get(term, 0) + 1

    q_set = set(_bm25_terms(query))
    f_set = {f.lower() for f in (focus_terms or []) if f}

    scored = []
    for idx, unit in enumerate(units):
        rendered = _restore_segments(unit["text"], preserves)
        toks = count_tokens(rendered, encoding)
        terms = docs[idx]
        dl = max(1, len(terms))
        tf: dict[str, int] = {}
        for t in terms:
            tf[t] = tf.get(t, 0) + 1

        idf_sum = sum(math.log(1 + (n_docs - df.get(t, 0) + 0.5) / (df.get(t, 0) + 0.5)) for t in tf)
        entropy = idf_sum / math.sqrt(dl)

        bm25 = 0.0
        q_hits = 0
        for q in q_set:
            freq = tf.get(q, 0)
            if freq > 0:
                q_hits += 1
                idf = math.log(1 + (n_docs - df.get(q, 0) + 0.5) / (df.get(q, 0) + 0.5))
                bm25 += idf * ((freq * 2.5) / (freq + 1.5 * (0.25 + 0.75 * dl / avgdl)))

        lower = rendered.lower()
        focus_bonus = sum(6.0 for ft in f_set if ft in lower)
        has_neg = _has_negation(rendered)
        has_seg = "__TL_SEG_" in unit["text"]
        ent_count = len(_extract_entities(rendered))
        pos_bonus = 0.6 if (idx == 0 or idx == len(units) - 1) else 0.0

        score = (
            bm25 * 5.0
            + focus_bonus
            + entropy
            + min(ent_count, 6) * 0.45
            + (2.5 if has_neg else 0.0)
            + (4.0 if has_seg else 0.0)
            + pos_bonus
        )
        scored.append((idx, unit, toks, score, score / max(1, toks), q_hits))

    ranked = sorted(
        scored,
        key=lambda item: (1 if (q_set and item[5] > 0) else 0, item[3], item[4]),
        reverse=True,
    )
    chosen: set[int] = set()
    chosen_order: list[int] = []
    used = 0
    for idx, _, toks, _, _, _ in ranked:
        join_overhead = 1 if chosen_order else 0
        if used + toks + join_overhead <= budget:
            chosen.add(idx)
            chosen_order.append(idx)
            used += toks + join_overhead
    if not chosen and ranked:
        chosen.add(ranked[0][0])
        chosen_order.append(ranked[0][0])

    selected = [u for i, u in enumerate(units) if i in chosen]
    exact_tokens = count_tokens(_restore_segments(_join_units(selected), preserves), encoding)
    while len(chosen_order) > 1 and exact_tokens > budget:
        evicted_idx = chosen_order.pop()
        chosen.discard(evicted_idx)
        selected = [u for i, u in enumerate(units) if i in chosen]
        exact_tokens = count_tokens(_restore_segments(_join_units(selected), preserves), encoding)
    return selected, len(selected) < len(units)


def _hard_fit_budget(text: str, max_tokens: int, encoding: str) -> tuple[str, bool]:
    if not max_tokens or count_tokens(text, encoding) <= max_tokens:
        return text, False
    enc = _get_bpe_encoder(encoding)
    if enc is not None:
        ids = enc.encode(text)
        if len(ids) <= max_tokens:
            return text, False
        return enc.decode(ids[:max_tokens]).rstrip(), True
    words = text.split()
    lo, hi, best = 1, len(words), words[0] if words else ""
    while lo <= hi:
        mid = (lo + hi) // 2
        cand = " ".join(words[:mid])
        if count_tokens(cand, encoding) <= max_tokens:
            best = cand
            lo = mid + 1
        else:
            hi = mid - 1
    return best, True


def _normalize_vocab(custom_vocab: Any) -> dict[str, str]:
    vocab: dict[str, str] = {}
    if not custom_vocab:
        return vocab
    if isinstance(custom_vocab, dict):
        return {str(k): str(v) for k, v in custom_vocab.items()}
    if isinstance(custom_vocab, list):
        for item in custom_vocab:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                vocab[str(item[0])] = str(item[1])
            elif isinstance(item, dict):
                k = item.get("key") or item.get("term") or item.get("word") or item.get("token")
                v = item.get("value") or item.get("definition") or item.get("expanded")
                if k and v is not None:
                    vocab[str(k)] = str(v)
    return vocab


def _compile_notation(text: str, custom_vocab: Any, encoding: str) -> str | None:
    vocab = _normalize_vocab(custom_vocab)
    working, preserves, _ = _protect_segments(text.strip(), encoding)
    for k, v in sorted(vocab.items(), key=lambda x: len(x[1]), reverse=True):
        if v:
            working = re.sub(re.escape(v), k, working, flags=re.IGNORECASE)
    clean = _strip_phatic_noise(working, "lossless")
    lower = clean.lower()

    action = None
    for pat, tok in (
        (r"\b(cri[ae]r?|fa[cç]a|gerar?|gere|create|make|build|constru[ai]r?)\b", "cr"),
        (r"\b(corrij[ae]r?|resolv[ae]r?|fix|debug)\b", "fix"),
        (r"\b(expliqu?[ae]r?|explain|como funciona)\b", "ex"),
        (r"\b(refator[ae]r?|refactor)\b", "rf"),
        (r"\b(otimiz[ae]r?|optimize)\b", "op"),
        (r"\b(test[ae]r?|testes?)\b", "tst"),
        (r"\b(document[ae]r?|readme)\b", "doc"),
        (r"\b(convert[ae]r?|migrar?|transform[ae]r?)\b", "cv"),
        (r"\b(revis[ae]r?|review|audit[ae]r?)\b", "rev"),
        (r"\b(resum[aiu]r?|summarize)\b", "sum"),
    ):
        if re.search(pat, lower):
            action = tok
            break
    if not action:
        return None

    lang = None
    for pat, tok in (
        (r"\b(python|py)\b", "$py"), (r"\b(typescript|ts)\b", "$ts"),
        (r"\b(javascript|js|node\.?js|nodejs)\b", "$js"), (r"\bsql\b", "$sql"),
        (r"\b(golang|go\b(?!ogle))", "$go"), (r"\brust\b", "$rs"),
        (r"\b(shell|bash)\b", "$sh"), (r"\bjava\b(?!script)", "$java"),
    ):
        if re.search(pat, lower):
            lang = tok
            break

    fws: list[str] = []
    for pat, tok in (
        (r"\bstreamlit\b", "@streamlit"), (r"\bfastapi\b", "@fastapi"),
        (r"\bflask\b", "@flask"), (r"\bdjango\b", "@django"),
        (r"\bpandas\b", "@pandas"), (r"\b(matplotlib|plotly)\b", "@plt"),
        (r"\breact\b", "@react"), (r"\bnext\.?js\b|\bnext\b", "@next"),
        (r"\bexpress\b", "@express"), (r"\bprisma\b", "@prisma"),
        (r"\b(postgres|postgresql)\b", "@pg"), (r"\bmongo(?:db)?\b", "@mongo"),
        (r"\bsupabase\b", "@supabase"), (r"\bjwt\b", "@jwt"),
    ):
        if re.search(pat, lower) and tok not in fws:
            fws.append(tok)

    struct = None
    for pat, tok in (
        (r"\b(fun[cç][aã]o|function)\b", "#fn"), (r"\b(classe|class)\b", "#cls"),
        (r"\bscript\b", "#scr"), (r"\b(api|rest|endpoint)\b", "#api"),
        (r"\b(componente|component)\b", "#comp"), (r"\bhook\b", "#hook"),
        (r"\bmiddleware\b", "#mw"),
    ):
        if re.search(pat, lower):
            struct = tok
            break

    modifiers: list[str] = []
    if re.search(r"\b(bonit[oa]|visual|estilizad[oa]|ui|lind[oa]|interativ[oa]|responsiv[oa]|styled)\b", lower):
        modifiers.append("ui+")
    if re.search(r"\b(produ[cç][aã]o|boas pr[aá]ticas|prd|robust[oa]|production)\b", lower):
        modifiers.append("prd")
    if re.search(r"\b(coment[aá]rios?|comentad[oa]|well.?commented)\b", lower):
        modifiers.append("cm")
    if re.search(r"\b(exemplos?|pr[aá]tic[oa]|did[aá]tic[oa])\b", lower):
        modifiers.append("dk")
    if re.search(r"\b(tipagem|tipad[oa]|typed|type hints)\b", lower):
        modifiers.append("typ")
    if re.search(r"\b(ass[ií]ncron[oa]|async)\b", lower):
        modifiers.append("async")
    if re.search(r"\b(minimalista|minimal|lightweight)\b", lower):
        modifiers.append("min")

    captured = {
        "criar", "crie", "cria", "faça", "faca", "gerar", "gere", "create", "make", "build",
        "python", "py", "javascript", "js", "typescript", "ts", "sql", "streamlit", "fastapi",
        "flask", "react", "next", "express", "postgres", "postgresql", "script", "api", "rest",
        "função", "funcao", "classe", "middleware",
        "bonito", "bonita", "visual", "estilizado", "pronto", "produção", "producao",
        "comentários", "comentarios", "exemplos", "tipagem", "assíncrono", "minimalista",
    }
    task_words: list[str] = []
    for w in clean.split():
        if "__TL_SEG_" in w:
            task_words.append(w)
            continue
        stripped = re.sub(r"^[^a-zA-Z0-9À-ÿ!=<>]+|[^a-zA-Z0-9À-ÿ!=<>]+$", "", w)
        if not stripped:
            continue
        lw = stripped.lower()
        if lw in _SAFE_NOTATION_STOPWORDS or lw in captured:
            continue
        task_words.append(stripped)

    header_parts = [action]
    if lang:
        header_parts.append(lang)
    header_parts.extend(fws[:3])
    if struct:
        header_parts.append(struct)
    parts = [" ".join(header_parts)]
    if task_words:
        parts.append(" ".join(task_words))
    if modifiers:
        parts.append(" ".join(dict.fromkeys(modifiers)))
    return _restore_segments("; ".join(parts), preserves)


def compile_prompt(
    text: Any,
    *,
    mode: str = "balanced",
    max_tokens: int | None = None,
    query: str = "",
    encoding: str = "o200k_base",
    custom_vocab: Any = None,
    target_ratio: float | None = None,
    focus_terms: list[str] | None = None,
) -> dict[str, Any]:
    start = time.perf_counter()
    raw_text = text if isinstance(text, str) else json.dumps(text, indent=2, ensure_ascii=False)
    if not raw_text or not raw_text.strip():
        return {
            "version": VERSION, "mode": mode, "text": "", "tokens_before": 0, "tokens_after": 0,
            "tokens_saved": 0, "savings_pct": 0.0, "attention_flops_reduction_pct": 0.0,
            "truncated": False, "monotonic_fallback": False, "reversible_structured": False,
            "prefix_hash": sha256_hex(""), "stages_applied": [], "latency_ms": 0.0,
            "audit": {"raw_negations_count": 0, "preserved_negations_count": 0, "negations_preserved_ratio": 1.0, "monotonic_bpe_verified": True},
        }

    tokens_before = count_tokens(raw_text, encoding)
    stages: list[str] = []
    reversible = False
    truncated = False
    monotonic_fallback = False

    trimmed = raw_text.strip()
    compiled: str | None = None

    if (trimmed.startswith("{") and trimmed.endswith("}")) or (trimmed.startswith("[") and trimmed.endswith("]")):
        try:
            parsed = json.loads(trimmed)
            if isinstance(parsed, (dict, list)):
                minified = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
                tabular = encode_structured(parsed)
                best, best_t = raw_text, tokens_before
                if count_tokens(minified, encoding) < best_t:
                    best, best_t = minified, count_tokens(minified, encoding)
                    stages = ["json_minify"]
                    reversible = True
                if count_tokens(tabular, encoding) < best_t:
                    best, best_t = tabular, count_tokens(tabular, encoding)
                    stages = ["structural_tabular"]
                    reversible = True
                compiled = best
        except Exception:
            compiled = None

    if compiled is None and mode == "notation":
        notated = _compile_notation(raw_text, custom_vocab, encoding)
        if notated and count_tokens(notated, encoding) <= tokens_before:
            compiled = notated
            stages.append("notation_dsl")

    if compiled is None:
        working, preserves, seg_stages = _protect_segments(raw_text, encoding)
        stages.extend(sorted(seg_stages))

        processed, folded = _fold_repetitive_logs(working)
        if folded:
            stages.append("log_folding")

        if custom_vocab:
            vocab = _normalize_vocab(custom_vocab)
            for k, v in sorted(vocab.items(), key=lambda x: len(x[1]), reverse=True):
                if v and count_tokens(k, encoding) < count_tokens(v, encoding):
                    nxt = re.sub(re.escape(v), k, processed, flags=re.IGNORECASE)
                    if nxt != processed:
                        processed = nxt
                        if "custom_vocab" not in stages:
                            stages.append("custom_vocab")

        after_phatic = _strip_phatic_noise(processed, "lossless" if mode == "lossless" else mode)
        if after_phatic != processed:
            processed = after_phatic
            stages.append("phatic_strip")

        units = _split_units(processed)
        units, removed = _deduplicate_units(units, "lossless" if mode == "lossless" else mode)
        if removed > 0:
            stages.append("shingle_dedup")

        if mode != "lossless" or max_tokens:
            units, pruned = _extractive_select(
                units, preserves, mode, encoding,
                query=query, max_tokens=max_tokens,
                target_ratio=target_ratio, focus_terms=focus_terms,
            )
            if pruned:
                stages.append("extractive_bm25")
                truncated = True

        compiled = _restore_segments(_join_units(units), preserves).strip()

    if count_tokens(compiled, encoding) > tokens_before:
        compiled = raw_text
        monotonic_fallback = True
        stages = ["monotonicity_rollback"]
        reversible = False

    if max_tokens and count_tokens(compiled, encoding) > max_tokens:
        compiled, fit_trunc = _hard_fit_budget(compiled, max_tokens, encoding)
        truncated = truncated or fit_trunc
        reversible = False
        if "hard_budget_fit" not in stages:
            stages.append("hard_budget_fit")

    tokens_after = count_tokens(compiled, encoding)
    tokens_saved = max(0, tokens_before - tokens_after)
    savings_pct = round((tokens_saved / tokens_before) * 100, 2) if tokens_before > 0 else 0.0
    flops_ratio = (tokens_after / tokens_before) ** 2 if tokens_before > 0 else 1.0
    flops_reduction = round((1.0 - min(1.0, flops_ratio)) * 100, 2) if tokens_before > 0 else 0.0

    raw_negs = _extract_negations(_dedupe_exact_sentences_for_audit(raw_text))
    out_negs = _extract_negations(compiled)
    out_counts: dict[str, int] = {}
    for n in out_negs:
        out_counts[n] = out_counts.get(n, 0) + 1
    preserved_negs = 0
    for n in raw_negs:
        if out_counts.get(n, 0) > 0:
            preserved_negs += 1
            out_counts[n] -= 1
    neg_ratio = 1.0 if not raw_negs else round(preserved_negs / len(raw_negs), 4)

    return {
        "version": VERSION,
        "mode": mode,
        "text": compiled,
        "tokens_before": tokens_before,
        "tokens_after": tokens_after,
        "tokens_saved": tokens_saved,
        "savings_pct": savings_pct,
        "attention_flops_reduction_pct": flops_reduction,
        "truncated": truncated,
        "monotonic_fallback": monotonic_fallback,
        "reversible_structured": reversible,
        "prefix_hash": sha256_hex(compiled),
        "stages_applied": stages,
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
        "audit": {
            "raw_negations_count": len(raw_negs),
            "preserved_negations_count": preserved_negs,
            "negations_preserved_ratio": neg_ratio,
            "monotonic_bpe_verified": tokens_after <= tokens_before,
        },
    }


def compile_messages(
    messages: list[dict[str, Any]],
    *,
    provider: str = "openai",
    mode: str = "balanced",
    encoding: str | None = None,
    custom_vocab: Any = None,
    cache_hit_rate: float = 0.85,
    requests_per_batch: int = 1000,
    max_dynamic_tokens_per_message: int | None = None,
) -> dict[str, Any]:
    pkey = (provider or "openai").lower()
    profile = PROVIDER_PROFILES.get(pkey, PROVIDER_PROFILES["openai"])
    enc = encoding or profile["encoding"]

    active_query = ""
    for msg in reversed(messages):
        if msg.get("role") == "user" and isinstance(msg.get("content"), str):
            active_query = msg["content"][:400]
            break

    static_boundary = -1
    for i, msg in enumerate(messages):
        if (msg.get("role") in ("system", "developer") or msg.get("cacheable") is True) and i == static_boundary + 1:
            static_boundary = i
        else:
            break

    out_messages: list[dict[str, Any]] = []
    raw_static = comp_static = raw_dyn = comp_dyn = 0
    static_parts: list[str] = []
    audit: list[dict[str, Any]] = []

    for i, msg in enumerate(messages):
        content = msg.get("content")
        if not isinstance(content, str):
            out_messages.append(dict(msg))
            continue
        is_tier0 = i <= static_boundary
        rep = (
            compile_prompt(content, mode="lossless", encoding=enc, custom_vocab=custom_vocab)
            if is_tier0
            else compile_prompt(
                content,
                mode=mode,
                encoding=enc,
                query=active_query if i < len(messages) - 1 else "",
                max_tokens=max_dynamic_tokens_per_message,
                custom_vocab=custom_vocab,
            )
        )
        new_msg = {k: v for k, v in msg.items() if k != "cacheable"}
        new_msg["content"] = rep["text"]
        out_messages.append(new_msg)

        if is_tier0:
            raw_static += rep["tokens_before"]
            comp_static += rep["tokens_after"]
            static_parts.append(f"{msg.get('role')}:{rep['text']}")
        else:
            raw_dyn += rep["tokens_before"]
            comp_dyn += rep["tokens_after"]

        audit.append({
            "index": i,
            "role": msg.get("role"),
            "tier": "static_tier0" if is_tier0 else "dynamic_tier2",
            "tokens_before": rep["tokens_before"],
            "tokens_after": rep["tokens_after"],
            "savings_pct": rep["savings_pct"],
            "stages_applied": rep["stages_applied"],
        })

    prefix_hash = sha256_hex("\n---\n".join(static_parts))
    eligible = static_boundary >= 0 and comp_static >= profile["cache_floor_tokens"]
    if eligible and pkey == "anthropic":
        out_messages[static_boundary]["cache_control"] = {"type": "ephemeral"}

    raw_total = raw_static + raw_dyn
    comp_total = comp_static + comp_dyn
    p_in = profile["input_usd_per_1m"] / 1e6
    p_read = profile["cache_read_usd_per_1m"] / 1e6
    p_write = profile["cache_write_usd_per_1m"] / 1e6

    raw_uncached_usd = round(raw_total * p_in * requests_per_batch, 6)
    raw_eligible = static_boundary >= 0 and raw_static >= profile["cache_floor_tokens"]
    raw_cached_static = (
        raw_static * (cache_hit_rate * p_read + (1 - cache_hit_rate) * p_write)
        if raw_eligible
        else raw_static * p_in
    )
    raw_cached_usd = round((raw_cached_static + raw_dyn * p_in) * requests_per_batch, 6)

    capc_static = (
        comp_static * (cache_hit_rate * p_read + (1 - cache_hit_rate) * p_write)
        if eligible
        else comp_static * p_in
    )
    capc_usd = round((capc_static + comp_dyn * p_in) * requests_per_batch, 6)

    return {
        "version": VERSION,
        "provider": profile["name"],
        "messages": out_messages,
        "cache": {
            "prefix_hash": prefix_hash,
            "static_boundary_index": static_boundary,
            "static_tokens_before": raw_static,
            "static_tokens_after": comp_static,
            "floor_tokens": profile["cache_floor_tokens"],
            "eligible": eligible,
        },
        "metrics": {
            "total_tokens_before": raw_total,
            "total_tokens_after": comp_total,
            "tokens_saved": max(0, raw_total - comp_total),
            "savings_pct": round((max(0, raw_total - comp_total) / raw_total) * 100, 2) if raw_total else 0.0,
        },
        "economics": {
            "requests_per_batch": requests_per_batch,
            "cache_hit_rate": cache_hit_rate,
            "raw_uncached_usd": raw_uncached_usd,
            "raw_cached_usd": raw_cached_usd,
            "capc_steady_state_usd": capc_usd,
            "capc_savings_vs_raw_pct": round(((raw_uncached_usd - capc_usd) / raw_uncached_usd) * 100, 2) if raw_uncached_usd else 0.0,
            "capc_savings_vs_cached_pct": round(((raw_cached_usd - capc_usd) / raw_cached_usd) * 100, 2) if raw_cached_usd else 0.0,
        },
        "audit": audit,
    }


def compress_locally(text: str, custom_vocab: Any = None, mode: str = "balanced") -> str:
    if not text or not isinstance(text, str):
        return ""
    return compile_prompt(text, mode=mode, custom_vocab=custom_vocab)["text"]


def expand(toklang_text: str, custom_vocab: Any = None) -> str:
    if not toklang_text or not isinstance(toklang_text, str):
        return ""
    trimmed = toklang_text.strip()
    if trimmed.startswith("@table") or trimmed.startswith("@struct{"):
        return json.dumps(decode_structured(trimmed), indent=2, ensure_ascii=False)

    vocab = _normalize_vocab(custom_vocab)
    local_actions = ACTIONS.copy()
    local_languages = LANGUAGES.copy()
    local_frameworks = FRAMEWORKS.copy()
    local_structures = STRUCTURES.copy()
    local_modifiers = MODIFIERS.copy()

    for key, val in vocab.items():
        lk = key.lower()
        if key.startswith("$"):
            local_languages[key[1:].lower()] = val
        elif key.startswith("@"):
            local_frameworks[key[1:].lower()] = val
        elif key.startswith("#"):
            local_structures[key[1:].lower()] = val
        elif lk in local_actions:
            local_actions[lk] = val
        elif lk in local_modifiers:
            local_modifiers[lk] = val

    parts = [p.strip() for p in trimmed.split(";") if p.strip()]
    if not parts:
        return ""

    action = lang = structure = ""
    frameworks: list[str] = []
    for token in parts[0].split():
        lt = token.lower()
        if lt in local_actions:
            action = local_actions[lt]
        elif token.startswith("$"):
            lang = local_languages.get(token[1:].lower(), token[1:])
        elif token.startswith("@"):
            frameworks.append(local_frameworks.get(token[1:].lower(), token[1:]))
        elif token.startswith("#"):
            structure = local_structures.get(token[1:].lower(), token[1:])

    task = ""
    inputs: list[str] = []
    outputs: list[str] = []
    errors: list[str] = []
    active_mods: list[str] = []

    for part in parts[1:]:
        if part.startswith("in["):
            m = re.match(r"in\[(.*?)\]", part)
            if m:
                inputs = [s.strip() for s in m.group(1).split(",") if s.strip()]
        elif part.startswith("out["):
            m = re.match(r"out\[(.*?)\]", part)
            if m:
                outputs = [s.strip() for s in m.group(1).split(",") if s.strip()]
        elif part.startswith("err["):
            m = re.match(r"err\[(.*?)\]", part)
            if m:
                errors = [s.strip() for s in m.group(1).split(",") if s.strip()]
        else:
            words = part.split()
            if words and all(w.lower() in local_modifiers for w in words):
                active_mods.extend(local_modifiers[w.lower()] for w in words)
            else:
                task = f"{task}; {part}" if task else part

    result = action or "Execute a tarefa"
    if structure:
        result += f" {structure}"
    if lang:
        result += f" em {lang}"
    if frameworks:
        result += f" usando {' e '.join(frameworks)}"
    if task:
        result += f": {task}"

    params = []
    if inputs:
        params.append(f"Entradas: [{', '.join(inputs)}]")
    if outputs:
        params.append(f"Saídas: [{', '.join(outputs)}]")
    if errors:
        params.append(f"Tratar erros: [{', '.join(errors)}]")
    if params:
        result += ". " + "; ".join(params)
    if active_mods:
        result += f". Requisitos: {', '.join(active_mods)}"
    if result and not result.endswith("."):
        result += "."

    for key, val in sorted(vocab.items(), key=lambda x: len(x[0]), reverse=True):
        keys_to_replace = [key, key[1:]] if key[:1] in ("$", "@", "#") else [key]
        for k in keys_to_replace:
            if len(k) >= 2:
                result = re.sub(r"\b" + re.escape(k) + r"\b", val, result, flags=re.IGNORECASE)
    return result


class TokLang:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://toklang.dev/api/v1",
        custom_vocab: Any = None,
        mode: str = "balanced",
        encoding: str = "o200k_base",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.custom_vocab = custom_vocab
        self.mode = mode
        self.encoding = encoding

    def compile(self, prompt: Any, **kwargs: Any) -> dict[str, Any]:
        return compile_prompt(
            prompt,
            mode=kwargs.get("mode", self.mode),
            max_tokens=kwargs.get("max_tokens"),
            query=kwargs.get("query", ""),
            encoding=kwargs.get("encoding", self.encoding),
            custom_vocab=kwargs.get("custom_vocab", self.custom_vocab),
        )

    def compress(self, prompt: Any, custom_vocab: Any = None, remote: bool = False, **kwargs: Any) -> dict[str, Any]:
        vocab = custom_vocab if custom_vocab is not None else self.custom_vocab
        if not remote:
            rep = self.compile(prompt, custom_vocab=vocab, **kwargs)
            return {
                "compressed": rep["text"],
                "savings": f"{round(rep['savings_pct'])}%",
                "savings_pct": rep["savings_pct"],
                "tokens_before": rep["tokens_before"],
                "tokens_after": rep["tokens_after"],
                "prefix_hash": rep["prefix_hash"],
                "audit": rep["audit"],
            }
        req = urllib.request.Request(f"{self.base_url}/compress", method="POST")
        req.add_header("Content-Type", "application/json")
        if self.api_key:
            req.add_header("x-api-key", self.api_key)
        payload = json.dumps({"prompt": prompt, "customVocab": vocab}).encode("utf-8")
        with urllib.request.urlopen(req, data=payload, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def compile_messages(self, messages: list[dict[str, Any]], **kwargs: Any) -> dict[str, Any]:
        return compile_messages(
            messages,
            provider=kwargs.get("provider", "openai"),
            mode=kwargs.get("mode", self.mode),
            encoding=kwargs.get("encoding", self.encoding),
            custom_vocab=kwargs.get("custom_vocab", self.custom_vocab),
        )

    def expand(self, toklang_text: str, custom_vocab: Any = None) -> str:
        return expand(toklang_text, custom_vocab if custom_vocab is not None else self.custom_vocab)


class TokLangMiddleware:
    """CAPC-aware middleware wrapping OpenAI-compatible Python clients."""

    def __init__(
        self,
        openai_client: Any,
        toklang_api_key: str | None = None,
        custom_vocab: Any = None,
        provider: str = "openai",
        mode: str = "balanced",
    ) -> None:
        self.client = openai_client
        self.toklang_key = toklang_api_key
        self.custom_vocab = custom_vocab
        self.provider = provider
        self.mode = mode
        self.last_report: dict[str, Any] | None = None
        self._wrap_client()

    def _wrap_client(self) -> None:
        original_create = self.client.chat.completions.create

        def wrapped_create(*args: Any, **kwargs: Any) -> Any:
            messages = kwargs.get("messages")
            if isinstance(messages, list) and messages:
                report = compile_messages(
                    messages,
                    provider=self.provider,
                    mode=self.mode,
                    custom_vocab=self.custom_vocab,
                )
                self.last_report = report
                kwargs["messages"] = report["messages"]
            return original_create(*args, **kwargs)

        self.client.chat.completions.create = wrapped_create
