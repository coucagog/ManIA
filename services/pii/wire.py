"""
wire.py — Ou vit le texte dans un corps OpenAI-compatible, et quels chemins
sont autorises a traverser le proxy.

Pourquoi ce module existe (STACK-4 §54)
---------------------------------------
Le §50 avait releve TROIS voies de fuite, toutes situees non pas dans le coeur
de pseudonymisation mais dans la connaissance qu'a le service du FORMAT DE FIL :

  1. tout chemin autre que `chat/completions` etait relaye BRUT — un
     `/v1/embeddings` sur un dossier client partait en clair ;
  2. un `content` en BLOCS (`[{"type":"text",...}]`) n'etait pas masque, et
     n'etait meme pas compte par `assess_risk` : le garde-fou ne le voyait pas
     non plus ;
  3. les `tool_calls` n'etaient pas masques a l'aller — or Hermes est un AGENT,
     et c'est precisement la que vit la charge utile.

Ces trois defauts ont la meme racine : la liste des endroits ou vit le texte
etait ECRITE EN DUR dans `main.py`, une fois pour le calcul de risque et une
fois pour le masquage. Deux listes qui divergent, c'est un garde-fou qui
mesure autre chose que ce qu'il protege. Ce module en fait UNE SEULE
definition, partagee par les deux usages : `text_slots()` est la reponse
unique a la question « qu'est-ce qui part chez le fournisseur ? ».

Il est en stdlib pure et sans etat -> prouvable hors-ligne (`test_wire.py`),
comme `pii_engine.py` et `sse.py`. C'est delibere : la couche HTTP de ce
service est celle qui a porte TOUS ses defauts jusqu'ici.

Ce qu'on ne touche PAS, et pourquoi
-----------------------------------
- **Le tableau `tools`** (definitions de fonctions : noms, schemas JSON,
  descriptions, enums). Il decrit l'outillage de l'agent, pas les donnees de
  ses clients. Le pseudonymiser casserait l'appel d'outil exactement comme le
  prompt systeme pseudonymise cassait l'instruction (§53, `entites=162`) : un
  agent qui ne sait plus quels outils il a.
- **Les blocs non textuels** (`image_url`, `input_audio`, `file`). Leur charge
  est du base64, et `CB` est en SUPPRESSION PURE avec un motif non ancre sur un
  mot-cle — Luhn passe sur ~10 % des suites de chiffres aleatoires. Masquer la
  aboutirait a une corruption silencieuse et IRREVERSIBLE (§50, option « C »).
  ⚠️ Consequence assumee : une PII dans une image n'est pas couverte par ce
  proxy. C'est une limite a annoncer, pas un trou a masquer a moitie.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Iterable


# --------------------------------------------------------------------------- #
#  1. Liste blanche des chemins (fuite n°1)
# --------------------------------------------------------------------------- #

# Le SEUL chemin generatif que le proxy sait pseudonymiser de bout en bout.
GENERATIVE_PATH = "chat/completions"

# Chemins relayes tels quels. Deliberement minuscule : ce sont les seuls dont
# on a etabli qu'aucun texte utilisateur n'y transite. `models` est necessaire
# — Hermes le lit pour peupler son selecteur de modeles, et son echec se lirait
# comme « le proxy ne marche pas ».
_PASSTHROUGH_GET = ("models",)


def normalise_path(path: str) -> str:
    """Forme canonique d'un chemin, sans slash de tete ni de queue.

    Utilisee AUSSI a l'emission : concatener un chemin a slash de tete a la
    base amont donnerait `.../v1//chat/completions`, que certains fournisseurs
    refusent. Une seule forme, decidee ici, evite que la comparaison et
    l'emission divergent.
    """
    return path.strip("/")


def is_generative(method: str, path: str) -> bool:
    """Vrai pour le seul appel que le proxy traite (et masque)."""
    return method.upper() == "POST" and normalise_path(path) == GENERATIVE_PATH


def is_passthrough_allowed(method: str, path: str) -> bool:
    """Vrai pour les chemins relayables bruts sans risque de fuite.

    /!\\ DENY BY DEFAULT. Tout le reste — `/v1/embeddings` (vectoriser un
    dossier client), `/v1/completions`, `/v1/responses`, et tout chemin futur
    d'un fournisseur — est REFUSE, pas relaye. La v1 faisait l'inverse : elle
    relayait tout ce qu'elle ne savait pas traiter, ce qui transformait chaque
    nouveaute d'API amont en fuite silencieuse.

    Un refus visible est le comportement voulu : un agent muet se voit, une
    fuite silencieuse non (doctrine §53).
    """
    if method.upper() != "GET":
        return False
    p = normalise_path(path)
    return any(p == a or p.startswith(a + "/") for a in _PASSTHROUGH_GET)


# --------------------------------------------------------------------------- #
#  2. Ou vit le texte dans `messages` (fuites n°2 et n°3)
# --------------------------------------------------------------------------- #

# Types de blocs porteurs de texte, au sens de l'API OpenAI (et de ses clones).
# Tout autre type est ignore — voir l'en-tete du module.
_TEXT_BLOCK_TYPES = frozenset({"text", "input_text", "output_text"})


@dataclass(frozen=True)
class TextSlot:
    """Un emplacement de texte, designe par son conteneur et sa cle.

    On ne manipule pas des copies : ecrire dans un slot ecrit dans le corps de
    requete lui-meme. C'est ce qui garantit que le texte EVALUE (risque) et le
    texte MASQUE sont litteralement le meme — la divergence entre les deux
    etait la fuite n°2.
    """

    container: Any          # dict ou list
    key: Any                # str (dict) ou int (list)
    origin: str             # "content" | "bloc" | "tool_arguments" — jamais le texte

    def get(self) -> str:
        return self.container[self.key]

    def set(self, value: str) -> None:
        self.container[self.key] = value


def text_slots(messages: Iterable[dict], *, include_system: bool = False) -> list[TextSlot]:
    """Enumere TOUS les emplacements de texte qui partiraient chez le fournisseur.

    `include_system=False` (defaut) exclut `role: system` : tranche par la
    mesure au §53 (le SOUL/AGENTS.md du locataire portait 159 des 162 entites,
    et ses instructions partaient reduites en jetons). Voir `PSEUDO_SYSTEM`
    dans `main.py` pour la justification complete.

    Emplacements couverts :
      - `content` en chaine (y compris les messages `role: tool`, dont le
        resultat d'outil est souvent le texte le PLUS charge en PII) ;
      - `content` en blocs -> le champ `text` des blocs textuels seuls ;
      - `tool_calls[].function.arguments` -> la charge utile d'un agent.
    """
    slots: list[TextSlot] = []
    for m in messages:
        if not isinstance(m, dict):
            continue
        # Absence de role -> traite comme non-systeme : en cas de doute on
        # masque, jamais l'inverse.
        if not include_system and m.get("role") == "system":
            continue

        content = m.get("content")
        if isinstance(content, str):
            slots.append(TextSlot(m, "content", "content"))
        elif isinstance(content, list):
            for i, bloc in enumerate(content):
                if (
                    isinstance(bloc, dict)
                    and bloc.get("type") in _TEXT_BLOCK_TYPES
                    and isinstance(bloc.get("text"), str)
                ):
                    slots.append(TextSlot(bloc, "text", "bloc"))

        # `tool_calls` : la fuite n°3 a l'aller. Un message assistant qui
        # appelle un outil a `content: null` et TOUT dans les arguments.
        # `arguments` est une CHAINE de JSON ; on la traite comme du texte brut
        # plutot que de la reparser. C'est sur : un jeton `[NOM_1]` (et le
        # marqueur de suppression) ne contient ni guillemet ni antislash, donc
        # la substitution laisse le JSON valide. Reparser exigerait au
        # contraire de decider quoi faire d'un `arguments` malforme — un cas ou
        # se glisserait une fuite.
        for tc in m.get("tool_calls") or []:
            if not isinstance(tc, dict):
                continue
            fn = tc.get("function")
            if isinstance(fn, dict) and isinstance(fn.get("arguments"), str):
                slots.append(TextSlot(fn, "arguments", "tool_arguments"))

    return slots


def joined_text(slots: Iterable[TextSlot]) -> str:
    """Concatene le texte des slots — l'entree du calcul de risque.

    Meme source que le masquage, par construction : c'est tout l'objet du
    module.
    """
    return "\n".join(s.get() for s in slots)


def apply_to_slots(slots: Iterable[TextSlot], fn: Callable[[str], str]) -> int:
    """Applique `fn` a chaque slot, en place. Renvoie le nombre de slots ecrits."""
    n = 0
    for s in slots:
        s.set(fn(s.get()))
        n += 1
    return n


def slot_summary(slots: Iterable[TextSlot]) -> str:
    """Resume journalisable : combien de slots, de quelle nature. JAMAIS le texte.

    Sert la sonde et le diagnostic : `content=2 bloc=3 tool_arguments=1` dit
    d'un coup d'oeil qu'un corps en blocs ou un appel d'outil a bien ete vu —
    la fuite n°2 etait precisement invisible dans les logs.
    """
    compte: dict[str, int] = {}
    for s in slots:
        compte[s.origin] = compte.get(s.origin, 0) + 1
    if not compte:
        return "aucun"
    return " ".join(f"{k}={v}" for k, v in sorted(compte.items()))
