"""
sse.py — Re-emission d'une reponse de completion NON streamee en flux SSE.

Pourquoi ce module existe (STACK-4 §53)
---------------------------------------
La v1 du proxy REFUSAIT `stream: true` (400), en pariant sur le
`streaming.enabled: false` du config.yaml des tenants. La sonde a montre que ce
reglage ne gouverne PAS le champ envoye a l'API : la requete arrive bel et bien
avec `stream: true`. Faire dependre la conformite d'un reglage cote client —
que celui-ci peut rebasculer d'un clic, sans savoir qu'il desactive la
pseudonymisation — n'est pas tenable pour un service vendu.

Pourquoi on ne pseudonymise PAS au fil de l'eau
-----------------------------------------------
Restaurer sur un vrai flux amont exigerait un tampon anti-coupure-de-jeton : un
jeton `[NOM_1]` peut etre scinde entre deux chunks (`[NOM` / `_1]`), et
`Pseudonymizer.restore` travaille par `str.replace` sur le texte complet. Sur
des morceaux, il ne matcherait rien -> le jeton partirait TEL QUEL chez le
client (fuite de la forme, pas de la valeur, mais reponse cassee), et la valeur
reelle ne serait jamais reinjectee.

Repli retenu, volontairement modeste : appel amont en NON-streame, restauration
sur la reponse complete (chemin deja prouve), puis re-emission ici en un seul
evenement de contenu. Le client recoit un flux SSE valide ; il perd seulement
l'affichage progressif. Un refus visible valait mieux qu'une fuite silencieuse ;
une reponse correcte sans progressivite vaut mieux que les deux.

Ce module est en stdlib pure et sans etat -> il se prouve hors-ligne
(`python3 test_sse.py`), comme le coeur. C'est deliberé : la couche HTTP de ce
service est celle qui a porte tous les defauts jusqu'ici.
"""

from __future__ import annotations

import json
from typing import Iterator

DONE = "data: [DONE]\n\n"


def _event(payload: dict) -> str:
    # `ensure_ascii=False` : les accents partent en UTF-8 tel quel, comme le
    # ferait l'amont. Pas de separateur exotique — un evenement SSE se termine
    # par une ligne vide, d'ou le "\n\n".
    return "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"


def completion_to_sse(upstream: dict) -> Iterator[str]:
    """Convertit une reponse `chat.completion` en evenements `chat.completion.chunk`.

    Contrat respecte : un client qui accumule les `delta` successifs reconstitue
    EXACTEMENT la reponse non-streamee. On y parvient en envoyant le message
    entier comme unique delta — donc `content`, mais aussi `role`, `tool_calls`,
    `refusal`, `reasoning`... rien n'est perdu au passage, y compris les champs
    que le proxy ne sait pas encore traiter.

    L'ordre des evenements suit le format OpenAI : un chunk de contenu par
    `choice`, puis son chunk de fin (`finish_reason`), puis l'usage s'il existe,
    puis `[DONE]`.
    """
    base = {
        "id": upstream.get("id", ""),
        "object": "chat.completion.chunk",
        "created": upstream.get("created", 0),
        "model": upstream.get("model", ""),
    }
    if upstream.get("system_fingerprint") is not None:
        base["system_fingerprint"] = upstream["system_fingerprint"]

    choices = upstream.get("choices") or []
    for position, choice in enumerate(choices):
        message = dict(choice.get("message") or {})
        index = choice.get("index", position)

        tool_calls = message.get("tool_calls")
        if tool_calls:
            # En streame, chaque tool_call porte un `index` (il sert a
            # recoller les fragments d'arguments cote client). L'amont
            # non-streame ne le fournit pas -> on l'ajoute, sans quoi les
            # clients stricts ignorent l'appel d'outil. Copie explicite : ne
            # jamais muter la reponse amont, elle vient d'etre restauree.
            message["tool_calls"] = [
                {**tc, "index": tc.get("index", i)} for i, tc in enumerate(tool_calls)
            ]

        yield _event({**base, "choices": [
            {"index": index, "delta": message, "finish_reason": None},
        ]})
        yield _event({**base, "choices": [
            {"index": index, "delta": {}, "finish_reason": choice.get("finish_reason") or "stop"},
        ]})

    if upstream.get("usage"):
        # Chunk d'usage : `choices` vide, comme le fait l'amont avec
        # stream_options.include_usage. Sans lui, le client perd le comptage de
        # jetons — donc la facturation qu'il voit de sa propre cle (§4quater).
        yield _event({**base, "choices": [], "usage": upstream["usage"]})

    yield DONE
