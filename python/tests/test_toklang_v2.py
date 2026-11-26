"""TokLang Python SDK v2.0 — Parity & Invariants Test Suite (TDD)."""

import json
import sys
from pathlib import Path

ROOT_PY_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(ROOT_PY_SRC))

from toklang import (  # noqa: E402
    VERSION,
    TokLang,
    TokLangMiddleware,
    compile_messages,
    compile_prompt,
    count_tokens,
    decode_structured,
    encode_structured,
    expand,
)


def test_version_and_negation_lock():
    assert VERSION.startswith("2.")
    prompt = (
        "Bom dia! Por favor crie uma API REST em PostgreSQL sem autenticacao OAuth, "
        "nao use ORM e nunca exponha credenciais."
    )
    for mode in ("lossless", "balanced", "aggressive", "notation"):
        report = compile_prompt(prompt, mode=mode)
        lower = report["text"].lower()
        assert "sem" in lower
        assert "nao" in lower or "não" in lower
        assert "nunca" in lower
        assert "vlcdd" not in lower
        assert report["tokens_after"] <= report["tokens_before"]
        assert report["audit"]["negations_preserved_ratio"] == 1.0


def test_lossless_tabular_roundtrip_and_savings():
    payload = {
        "orders": [
            {
                "id": i + 1,
                "customer": f"Client_{i + 1}",
                "status": "paid" if i % 2 == 0 else "pending",
                "amount": 120.5 + i * 10,
                "verified": i % 3 != 0,
            }
            for i in range(14)
        ]
    }
    raw_json = json.dumps(payload, indent=2)
    encoded = encode_structured(payload)
    assert encoded.startswith("@table orders[14]{")
    assert count_tokens(encoded) < count_tokens(raw_json) * 0.65
    assert decode_structured(encoded) == payload


def test_long_rag_extractive_budget_and_log_folding():
    noise = [
        f"Nota administrativa {i}: controle interno de almoxarifado e salas de reuniao sem impacto no consenso."
        for i in range(10)
    ]
    critical = (
        "Regra critica de consenso Raft: quorum exige floor(N/2)+1 nos ativos; "
        "nunca aceite escritas sem lider eleito para evitar split-brain."
    )
    doc = "\n\n".join(noise[:5] + [critical, critical] + noise[5:])
    report = compile_prompt(
        doc,
        mode="balanced",
        query="quorum minimo Raft split-brain",
        max_tokens=120,
    )
    assert report["tokens_after"] <= 120
    assert "floor(N/2)+1" in report["text"]
    assert "nunca" in report["text"].lower()

    logs = "\n".join(
        ["2026-11-26T10:00:00Z INFO boot ok"]
        + ["2026-11-26T10:00:01Z WARN cache miss shard_02"] * 12
        + ["2026-11-26T10:00:02Z ERROR timeout shard_02"]
    )
    log_report = compile_prompt(logs, mode="lossless")
    assert "[x12]" in log_report["text"]
    assert log_report["tokens_after"] < log_report["tokens_before"] * 0.5


def test_capc_compile_messages_stable_prefix_and_middleware():
    system_prompt = "\n".join(
        [
            f"Politica de seguranca {i}: Todas as queries na tabela ledger_{i} devem filtrar por organization_id com RLS ativo e nunca vazar registros."
            for i in range(45)
        ]
    )
    r1 = compile_messages(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Bom dia! Verifique a tabela ledger_3 sem alterar indices."},
        ],
        provider="anthropic",
    )
    r2 = compile_messages(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Explique a tabela ledger_9."},
        ],
        provider="anthropic",
    )
    assert r1["cache"]["prefix_hash"] == r2["cache"]["prefix_hash"]
    assert len(r1["cache"]["prefix_hash"]) == 64
    assert r1["cache"]["eligible"] is True
    assert r1["messages"][0]["cache_control"] == {"type": "ephemeral"}
    assert r1["economics"]["capc_steady_state_usd"] < r1["economics"]["raw_uncached_usd"]

    captured = {}

    class DummyCompletions:
        def create(self, **kwargs):
            captured["messages"] = kwargs["messages"]
            return {"ok": True}

    class DummyChat:
        completions = DummyCompletions()

    class DummyOpenAI:
        chat = DummyChat()

    client = DummyOpenAI()
    mw = TokLangMiddleware(client, provider="openai")
    client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Ola! Por favor gere um relatorio sem dados pessoais."},
        ],
    )
    assert "sem" in captured["messages"][1]["content"].lower()
    assert mw.last_report is not None
    assert mw.last_report["cache"]["prefix_hash"] == r1["cache"]["prefix_hash"]


def test_sdk_client_and_expand():
    sdk = TokLang()
    res = sdk.compress("Bom dia! Por favor crie um script python usando streamlit para calcular velocidade")
    assert res["tokens_after"] <= res["tokens_before"]
    assert "velocidade" in res["compressed"].lower()

    expanded = expand("cr $py @streamlit #scr; calcular velocidade; in[distancia, tempo]; ui+")
    assert "Crie" in expanded and "Python" in expanded and "Streamlit" in expanded
