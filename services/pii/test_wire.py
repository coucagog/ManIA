"""
Tests hors-ligne du format de fil (`wire.py`). Stdlib pure : ni reseau, ni
fastapi, ni Presidio. Meme patron que `test_pii_engine.py` et `test_sse.py`.

Ce fichier couvre les TROIS voies de fuite du §50, chacune avec son test de
non-regression : le chemin refuse, le bloc masque, l'argument d'outil masque —
et, symetriquement, ce qu'on a decide de NE PAS toucher (tableau `tools`,
blocs image, prompt systeme).

Lancer :  python3 test_wire.py
"""

from __future__ import annotations

import json

from wire import (
    apply_to_slots,
    is_generative,
    is_passthrough_allowed,
    joined_text,
    normalise_path,
    slot_summary,
    text_slots,
)

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


def _majuscule(_: str) -> str:
    """Faux pseudonymiseur : rend une valeur reconnaissable a l'oeil nu."""
    return "<<MASQUE>>"


# --------------------------------------------------------------------------- #
#  [1] Fuite n°1 — liste blanche des chemins
# --------------------------------------------------------------------------- #

def test_liste_blanche():
    print("\n[1] Liste blanche des chemins (fuite n°1)")
    check("POST chat/completions est le chemin generatif",
          is_generative("POST", "chat/completions"))
    check("le slash de tete ne change rien",
          is_generative("POST", "/chat/completions"))
    check("GET chat/completions n'est pas generatif",
          not is_generative("GET", "chat/completions"))

    # Ce qui doit passer.
    check("GET models autorise", is_passthrough_allowed("GET", "models"))
    check("GET models/<id> autorise",
          is_passthrough_allowed("GET", "models/anthropic/claude-opus-4.8"))

    # Ce qui doit etre REFUSE — les fuites nommees au §50.
    for chemin in ("embeddings", "completions", "responses", "moderations"):
        check(f"POST {chemin} refuse",
              not is_generative("POST", chemin) and not is_passthrough_allowed("POST", chemin))
    check("POST models refuse (le GET seul est blanc)",
          not is_passthrough_allowed("POST", "models"))
    check("un chemin inconnu est refuse par defaut",
          not is_passthrough_allowed("GET", "nouveaute-fournisseur-2027"))
    check("un chemin qui commence comme un chemin blanc n'est pas blanchi",
          not is_passthrough_allowed("GET", "models-internes"))
    check("chat/completions-raw n'est PAS traite comme generatif",
          not is_generative("POST", "chat/completions-raw"))

    # La forme canonique sert AUSSI a l'emission : un slash de tete donnerait
    # `<amont>/v1//chat/completions` chez le fournisseur.
    check("normalise_path retire les slashs de tete et de queue",
          normalise_path("/chat/completions/") == "chat/completions")
    check("normalise_path est idempotente",
          normalise_path(normalise_path("/models")) == "models")


# --------------------------------------------------------------------------- #
#  [2] Fuite n°2 — `content` en blocs
# --------------------------------------------------------------------------- #

def test_content_en_blocs():
    print("\n[2] `content` en blocs (fuite n°2)")
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": "Voici le dossier de Fatou Ndiaye."},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAAA4111111111111111"}},
            {"type": "text", "text": "Merci de rediger le courrier."},
        ]},
    ]
    slots = text_slots(messages)
    check("les 2 blocs textuels sont vus", len(slots) == 2)
    check("les deux blocs sont comptes comme 'bloc'",
          all(s.origin == "bloc" for s in slots))
    check("le texte des blocs entre dans le calcul de risque",
          "Fatou Ndiaye" in joined_text(slots))

    apply_to_slots(slots, _majuscule)
    envoye = json.dumps(messages, ensure_ascii=False)
    check("aucun texte de bloc ne part en clair", "Fatou Ndiaye" not in envoye)
    check("le second bloc est masque aussi", "rediger le courrier" not in envoye)
    # Le point delicat : l'image ne doit PAS etre touchee (§50, option « C » —
    # `CB` est en suppression pure et Luhn passe sur ~10 % des suites de
    # chiffres : masquer du base64 corromprait sans retour possible).
    check("le base64 de l'image est intact",
          messages[0]["content"][1]["image_url"]["url"].endswith("AAAA4111111111111111"))


# --------------------------------------------------------------------------- #
#  [3] Fuite n°3 — `tool_calls` a l'aller
# --------------------------------------------------------------------------- #

def test_tool_calls():
    print("\n[3] `tool_calls` a l'aller (fuite n°3)")
    messages = [
        {"role": "assistant", "content": None, "tool_calls": [
            {"id": "call_1", "type": "function", "function": {
                "name": "envoyer_courrier",
                "arguments": '{"destinataire": "Fatou Ndiaye", "tel": "77 710 40 30"}',
            }},
        ]},
        {"role": "tool", "tool_call_id": "call_1",
         "content": "Courrier remis a Fatou Ndiaye au 77 710 40 30."},
    ]
    slots = text_slots(messages)
    origines = sorted(s.origin for s in slots)
    check("l'argument d'outil ET le resultat d'outil sont vus",
          origines == ["content", "tool_arguments"])
    check("content: null n'est pas pris pour du texte",
          all(s.get() is not None for s in slots))

    apply_to_slots(slots, lambda t: t.replace("Fatou Ndiaye", "[NOM_1]"))
    args = messages[0]["tool_calls"][0]["function"]["arguments"]
    check("le nom est masque dans les arguments", "Fatou Ndiaye" not in args)
    # Le jeton ne contient ni guillemet ni antislash -> le JSON reste valide.
    check("les arguments restent du JSON valide", json.loads(args)["destinataire"] == "[NOM_1]")
    check("le nom est masque dans le resultat d'outil",
          "Fatou Ndiaye" not in messages[1]["content"])
    check("le nom de la fonction n'est pas touche",
          messages[0]["tool_calls"][0]["function"]["name"] == "envoyer_courrier")


# --------------------------------------------------------------------------- #
#  [4] Ce qu'on a decide de NE PAS toucher
# --------------------------------------------------------------------------- #

def test_perimetre_exclu():
    print("\n[4] Perimetre exclu : prompt systeme et tableau `tools`")
    messages = [
        {"role": "system", "content": "Tu assistes Dr Fatou Ndiaye, cabinet de Dakar."},
        {"role": "user", "content": "Un mot pour Awa Diop."},
    ]
    slots = text_slots(messages)
    check("le prompt systeme est hors perimetre par defaut", len(slots) == 1)
    check("c'est bien le message utilisateur qui reste",
          "Awa Diop" in joined_text(slots))

    # `PII_PSEUDONYMIZE_SYSTEM=1` doit restaurer le comportement v1.
    slots_v1 = text_slots(messages, include_system=True)
    check("include_system=True reprend le systeme", len(slots_v1) == 2)

    # Un message sans `role` est traite (en cas de doute, on masque).
    check("message sans role -> traite", len(text_slots([{"content": "x"}])) == 1)

    # Le tableau `tools` n'est PAS parcouru : le pseudonymiser casserait
    # l'appel d'outil, comme le prompt systeme pseudonymise cassait
    # l'instruction (§53).
    corps = {
        "messages": [{"role": "user", "content": "salut"}],
        "tools": [{"type": "function", "function": {
            "name": "chercher_patient", "description": "Cherche un patient par nom",
            "parameters": {"type": "object", "properties": {"nom": {"type": "string"}}},
        }}],
    }
    slots_corps = text_slots(corps["messages"])
    apply_to_slots(slots_corps, _majuscule)
    check("la description d'outil est intacte",
          corps["tools"][0]["function"]["description"] == "Cherche un patient par nom")
    check("le schema d'outil est intact",
          "nom" in corps["tools"][0]["function"]["parameters"]["properties"])


# --------------------------------------------------------------------------- #
#  [5] Robustesse et journal
# --------------------------------------------------------------------------- #

def test_robustesse():
    print("\n[5] Robustesse du parcours et resume journalisable")
    tordu = [
        None,                                             # pas un dict
        {"role": "user"},                                 # pas de content
        {"role": "user", "content": 42},                  # content non textuel
        {"role": "user", "content": [{"type": "image_url"}, "chaine nue", {"text": "sans type"}]},
        {"role": "assistant", "tool_calls": [None, {"function": None}, {"function": {}}]},
    ]
    slots = text_slots(tordu)
    check("un corps mal forme ne fait pas exploser le parcours", slots == [])

    melange = [
        {"role": "user", "content": "a"},
        {"role": "user", "content": [{"type": "text", "text": "b"}, {"type": "text", "text": "c"}]},
        {"role": "assistant", "tool_calls": [
            {"function": {"name": "f", "arguments": "{}"}}]},
    ]
    resume = slot_summary(text_slots(melange))
    check("le resume compte par nature", resume == "bloc=2 content=1 tool_arguments=1")
    check("resume d'une liste vide", slot_summary([]) == "aucun")

    check("apply_to_slots renvoie le nombre d'ecritures",
          apply_to_slots(text_slots(melange), _majuscule) == 4)
    check("tout le texte melange est bien masque",
          "<<MASQUE>>" in json.dumps(melange) and '"content": "a"' not in json.dumps(melange))


def main() -> int:
    test_liste_blanche()
    test_content_en_blocs()
    test_tool_calls()
    test_perimetre_exclu()
    test_robustesse()
    print(f"\n===== {_PASS} ok, {_FAIL} FAIL =====")
    return 1 if _FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
