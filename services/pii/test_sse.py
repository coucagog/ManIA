"""
Tests hors-ligne de la re-emission SSE (`sse.py`). Stdlib pure : ni reseau, ni
fastapi, ni Presidio. Meme patron que `test_pii_engine.py` — la couche HTTP
etant celle qui a porte tous les defauts du service, tout ce qui peut en etre
prouve hors-ligne doit l'etre.

Lancer :  python3 test_sse.py
"""

from __future__ import annotations

import copy
import json

from sse import DONE, completion_to_sse

_PASS = 0
_FAIL = 0


def check(label: str, cond: bool) -> None:
    global _PASS, _FAIL
    if cond:
        _PASS += 1
        print(f"  ok   {label}")
    else:
        _FAIL += 1
        print(f"  FAIL {label}")


def _parse(events: list[str]) -> list[dict]:
    """Rejoue le travail d'un client SSE : ne garde que les payloads JSON."""
    out = []
    for e in events:
        if e == DONE:
            continue
        out.append(json.loads(e[len("data: "):].strip()))
    return out


def _reponse(content: str = "Bonjour Fatou Ndiaye, joignable au 77 710 40 30.") -> dict:
    return {
        "id": "gen-abc123",
        "object": "chat.completion",
        "created": 1754500000,
        "model": "deepseek/deepseek-v4-flash",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
        }],
        "usage": {"prompt_tokens": 42, "completion_tokens": 17, "total_tokens": 59},
    }


def test_forme_du_flux():
    print("\n[1] Forme du flux SSE")
    events = list(completion_to_sse(_reponse()))
    check("le flux se termine par [DONE]", events[-1] == DONE)
    check("un seul [DONE]", sum(1 for e in events if e == DONE) == 1)
    check("chaque evenement prefixe 'data: '", all(e.startswith("data: ") for e in events))
    check("chaque evenement clos par une ligne vide", all(e.endswith("\n\n") for e in events))
    payloads = _parse(events)
    check("object = chat.completion.chunk", all(p["object"] == "chat.completion.chunk" for p in payloads))
    check("id repris de l'amont", all(p["id"] == "gen-abc123" for p in payloads))
    check("model repris de l'amont", all(p["model"] == "deepseek/deepseek-v4-flash" for p in payloads))


def test_accumulation_reconstitue_la_reponse():
    print("\n[2] Un client qui accumule les deltas retrouve la reponse exacte")
    texte = "Bonjour Fatou Ndiaye, joignable au 77 710 40 30."
    payloads = _parse(list(completion_to_sse(_reponse(texte))))
    recolle = "".join(
        c["delta"].get("content", "")
        for p in payloads for c in p.get("choices", [])
    )
    check("contenu integralement restitue", recolle == texte)
    check("role assistant transmis", any(
        c["delta"].get("role") == "assistant" for p in payloads for c in p.get("choices", [])
    ))


def test_accents_preserves():
    print("\n[3] Accents (une valeur restauree peut en porter)")
    texte = "Rendez-vous prevu a Dakar avec Mme Diagne — controle d'acuite."
    payloads = _parse(list(completion_to_sse(_reponse(texte))))
    recolle = "".join(
        c["delta"].get("content", "")
        for p in payloads for c in p.get("choices", [])
    )
    check("texte accentue identique apres aller-retour JSON", recolle == texte)


def test_finish_reason():
    print("\n[4] finish_reason")
    payloads = _parse(list(completion_to_sse(_reponse())))
    finishes = [c["finish_reason"] for p in payloads for c in p.get("choices", [])]
    check("le chunk de contenu porte finish_reason=None", finishes[0] is None)
    check("un chunk de fin porte 'stop'", "stop" in finishes)

    sans = _reponse()
    sans["choices"][0]["finish_reason"] = None
    payloads = _parse(list(completion_to_sse(sans)))
    finishes = [c["finish_reason"] for p in payloads for c in p.get("choices", [])]
    check("finish_reason absent -> 'stop' par defaut", finishes[-1] == "stop")


def test_tool_calls():
    print("\n[5] tool_calls (Hermes est un agent : la charge utile vit la)")
    rep = _reponse()
    rep["choices"][0]["message"] = {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {"id": "call_1", "type": "function",
             "function": {"name": "envoyer_sms", "arguments": '{"tel":"77 710 40 30"}'}},
            {"id": "call_2", "type": "function",
             "function": {"name": "noter", "arguments": "{}"}},
        ],
    }
    rep["choices"][0]["finish_reason"] = "tool_calls"
    avant = copy.deepcopy(rep)

    payloads = _parse(list(completion_to_sse(rep)))
    deltas = [c["delta"] for p in payloads for c in p.get("choices", [])]
    tcs = deltas[0].get("tool_calls", [])
    check("les tool_calls traversent le flux", len(tcs) == 2)
    check("index ajoute (exige du format streame)", [t["index"] for t in tcs] == [0, 1])
    check("arguments intacts", tcs[0]["function"]["arguments"] == '{"tel":"77 710 40 30"}')
    check("finish_reason=tool_calls conserve", any(
        c["finish_reason"] == "tool_calls" for p in payloads for c in p.get("choices", [])
    ))
    check("la reponse amont n'est PAS mutee", rep == avant)


def test_usage():
    print("\n[6] Usage (le client facture sur sa propre cle, §4quater)")
    payloads = _parse(list(completion_to_sse(_reponse())))
    porteurs = [p for p in payloads if "usage" in p]
    check("un chunk d'usage est emis", len(porteurs) == 1)
    check("usage fidele", porteurs[0]["usage"]["total_tokens"] == 59)
    check("le chunk d'usage a un choices vide", porteurs[0]["choices"] == [])

    sans = _reponse()
    del sans["usage"]
    payloads = _parse(list(completion_to_sse(sans)))
    check("pas d'usage amont -> pas de chunk d'usage", not any("usage" in p for p in payloads))


def test_choix_multiples_et_bords():
    print("\n[7] Cas de bord")
    rep = _reponse()
    rep["choices"] = [
        {"index": 0, "message": {"role": "assistant", "content": "A"}, "finish_reason": "stop"},
        {"index": 1, "message": {"role": "assistant", "content": "B"}, "finish_reason": "length"},
    ]
    payloads = _parse(list(completion_to_sse(rep)))
    idx = [c["index"] for p in payloads for c in p.get("choices", [])]
    check("les deux choix sont emis", sorted(set(idx)) == [0, 1])
    check("finish_reason propre a chaque choix", "length" in [
        c["finish_reason"] for p in payloads for c in p.get("choices", [])
    ])

    vide = {"id": "x", "created": 1, "model": "m", "choices": []}
    events = list(completion_to_sse(vide))
    check("reponse sans choix -> flux clos proprement", events == [DONE])

    minimal = {"choices": [{"message": {"content": "ok"}}]}
    payloads = _parse(list(completion_to_sse(minimal)))
    check("champs amont manquants -> pas d'exception", payloads[0]["id"] == "")
    check("index deduit de la position", payloads[0]["choices"][0]["index"] == 0)


def main() -> int:
    test_forme_du_flux()
    test_accumulation_reconstitue_la_reponse()
    test_accents_preserves()
    test_finish_reason()
    test_tool_calls()
    test_usage()
    test_choix_multiples_et_bords()
    print(f"\n===== {_PASS} ok, {_FAIL} FAIL =====")
    return 1 if _FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
