"""
pii_engine.py — Cœur déterministe du proxy PII de MANIA.

Indépendant du transport (HTTP) et du détecteur NER concret : tout ce qui est ici
tourne en stdlib pur et se prouve hors-ligne. Presidio se branche derrière
l'interface `Detector` au moment du déploiement VPS (cf. presidio_adapter.py).

Doctrine (STACK §5 / §24) :
  - Jetons RÉVERSIBLES pour ce que la tâche doit garder (nom, date de naissance,
    n° de dossier, adresse, e-mail, téléphone) — restaurés dans la réponse.
  - SUPPRESSION PURE, jamais transmise ni restaurable, pour carte bancaire et
    n° de pièce d'identité (aucune raison de les envoyer au LLM).
  - La table de correspondance est de PORTÉE REQUÊTE, en mémoire, jamais persistée.
  - spaCy small rate (§16) → les reconnaisseurs déterministes ci-dessous PORTENT la
    fiabilité ; le NER n'est qu'un filet complémentaire.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Iterable, Protocol


# --------------------------------------------------------------------------- #
#  Types d'entités et politique associée
# --------------------------------------------------------------------------- #

# Politique par type : True = jeton réversible, False = suppression pure.
POLICY_REVERSIBLE: dict[str, bool] = {
    "NOM": True,
    "TEL": True,
    "EMAIL": True,
    "DATE": True,
    "DOSSIER": True,
    "ADRESSE": True,
    "CB": False,       # carte bancaire  -> supprimée
    "CNI": False,      # pièce d'identité -> supprimée
}

# Priorité de résolution des chevauchements (haut = gagne). Empêche par ex.
# qu'une CB Luhn-valide de 16 chiffres soit volée par le reconnaisseur téléphone.
PRIORITY: dict[str, int] = {
    "CB": 100,
    "CNI": 90,
    "EMAIL": 80,
    "TEL": 70,
    "DATE": 60,
    "DOSSIER": 50,
    "ADRESSE": 40,
    "NOM": 30,
}

REDACTION_MARKER = "[SUPPRIMÉ]"


@dataclass(frozen=True)
class Entity:
    """Une entité détectée, repérée par ses bornes dans le texte source."""
    type: str
    start: int
    end: int
    text: str


# --------------------------------------------------------------------------- #
#  Interface détecteur (Presidio se branche ici en prod)
# --------------------------------------------------------------------------- #

class Detector(Protocol):
    def detect(self, text: str) -> list[Entity]:
        ...


# --------------------------------------------------------------------------- #
#  Détecteur déterministe (reconnaisseurs regex + validations)
# --------------------------------------------------------------------------- #

def luhn_ok(number: str) -> bool:
    """Validation Luhn d'une suite de chiffres (13 à 19) — filtre les CB."""
    digits = [int(c) for c in number if c.isdigit()]
    if not (13 <= len(digits) <= 19):
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


# Un reconnaisseur = (type, motif compilé, validateur optionnel sur le match).
@dataclass(frozen=True)
class _Recognizer:
    type: str
    pattern: re.Pattern
    validate: Callable[[str], bool] | None = None


def _build_recognizers() -> list[_Recognizer]:
    recs: list[_Recognizer] = []

    # Carte bancaire : 13-19 chiffres, séparateurs espaces/tirets, Luhn valide.
    recs.append(_Recognizer(
        "CB",
        re.compile(r"\b(?:\d[ -]?){12,18}\d\b"),
        validate=luhn_ok,
    ))

    # CNI / NIN sénégalais : ancré sur un mot-clé pour éviter les faux positifs
    # (un long run de chiffres seul est trop ambigu avec dossier/téléphone).
    recs.append(_Recognizer(
        "CNI",
        re.compile(
            r"(?:CNI|C\.N\.I|carte\s+nationale(?:\s+d['e]identit[ée])?|NIN|"
            r"num[ée]ro\s+d['e]identit[ée])\s*[:n°]*\s*(\d[\d ]{10,20}\d)",
            re.IGNORECASE,
        ),
    ))

    # E-mail (adresse de contact / courrier -> réversible).
    recs.append(_Recognizer(
        "EMAIL",
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ))

    # Téléphone sénégalais : +221 / 00221 optionnel, puis 9 chiffres commençant
    # par 7 (mobile : 70/75/76/77/78) ou 3 (fixe : 33...), séparateurs libres.
    recs.append(_Recognizer(
        "TEL",
        re.compile(
            r"(?<!\d)(?:(?:\+|00)\s?221[\s.-]?)?"
            r"(?:7[05678]|33)(?:[\s.-]?\d){7}(?!\d)"
        ),
    ))

    # Date (jj/mm/aaaa et variantes) — sert surtout la date de naissance.
    recs.append(_Recognizer(
        "DATE",
        re.compile(r"\b(?:[0-3]?\d)[/.\-](?:[01]?\d)[/.\-](?:19|20)\d{2}\b"),
    ))

    # N° de dossier : ancré sur mot-clé, alphanumérique -> réversible.
    recs.append(_Recognizer(
        "DOSSIER",
        re.compile(
            r"(?:dossier|r[ée]f(?:[ée]rence)?|réf|dossier\s*n°|n°\s*dossier)"
            r"\s*[:n°]*\s*([A-Za-z]?\d[\w\-/]{2,})",
            re.IGNORECASE,
        ),
    ))

    return recs


class RegexDetector:
    """Détecteur déterministe : téléphone, e-mail, CB, CNI, date, dossier.

    C'est la couche PORTANTE de la fiabilité (voir en-tête du module). Les noms
    et adresses libres relèvent du NER (Presidio) et arrivent via un autre
    détecteur composé avec celui-ci.
    """

    def __init__(self) -> None:
        self._recs = _build_recognizers()

    def detect(self, text: str) -> list[Entity]:
        out: list[Entity] = []
        for rec in self._recs:
            for m in rec.pattern.finditer(text):
                # Si le motif capture un groupe (mot-clé + valeur), on ne
                # pseudonymise QUE la valeur, pas le mot-clé.
                if m.groups():
                    start, end = m.span(1)
                else:
                    start, end = m.span(0)
                frag = text[start:end]
                if rec.validate and not rec.validate(frag):
                    continue
                out.append(Entity(rec.type, start, end, frag))
        return out


class CompositeDetector:
    """Combine plusieurs détecteurs (ex. RegexDetector + Presidio/NER)."""

    def __init__(self, detectors: Iterable[Detector]) -> None:
        self._detectors = list(detectors)

    def detect(self, text: str) -> list[Entity]:
        found: list[Entity] = []
        for d in self._detectors:
            found.extend(d.detect(text))
        return found


# --------------------------------------------------------------------------- #
#  Résolution des chevauchements
# --------------------------------------------------------------------------- #

def resolve_overlaps(entities: list[Entity]) -> list[Entity]:
    """Garde, sur toute zone chevauchante, l'entité de plus haute priorité
    (à égalité, la plus longue). Renvoie une liste triée par position."""
    # Tri : priorité décroissante, puis longueur décroissante.
    ordered = sorted(
        entities,
        key=lambda e: (PRIORITY.get(e.type, 0), e.end - e.start),
        reverse=True,
    )
    kept: list[Entity] = []
    for e in ordered:
        if any(not (e.end <= k.start or e.start >= k.end) for k in kept):
            continue  # chevauche une entité déjà retenue, plus prioritaire
        kept.append(e)
    kept.sort(key=lambda e: e.start)
    return kept


# --------------------------------------------------------------------------- #
#  Pseudonymisation réversible / suppression
# --------------------------------------------------------------------------- #

@dataclass
class Pseudonymizer:
    """Applique la politique de jetons sur un texte, de façon cohérente à
    l'échelle d'une requête (une même valeur -> un même jeton)."""

    detector: Detector
    # État de portée requête (jamais persisté) :
    _counters: dict[str, int] = field(default_factory=dict)
    _by_surface: dict[tuple[str, str], str] = field(default_factory=dict)
    _mapping: dict[str, str] = field(default_factory=dict)  # jeton -> valeur réelle

    def _token_for(self, etype: str, surface: str) -> str:
        key = (etype, surface)
        if key in self._by_surface:
            return self._by_surface[key]
        n = self._counters.get(etype, 0) + 1
        self._counters[etype] = n
        token = f"[{etype}_{n}]"
        self._by_surface[key] = token
        if POLICY_REVERSIBLE.get(etype, True):
            self._mapping[token] = surface
        return token

    def pseudonymize(self, text: str) -> str:
        entities = resolve_overlaps(self.detector.detect(text))
        # Reconstruction de gauche à droite.
        parts: list[str] = []
        cursor = 0
        for e in entities:
            parts.append(text[cursor:e.start])
            if POLICY_REVERSIBLE.get(e.type, True):
                parts.append(self._token_for(e.type, e.text))
            else:
                # Suppression pure : marqueur non restaurable, valeur jamais retenue.
                parts.append(REDACTION_MARKER)
            cursor = e.end
        parts.append(text[cursor:])
        return "".join(parts)

    def restore(self, text: str) -> str:
        """Ré-insère les valeurs réelles des jetons RÉVERSIBLES uniquement.
        Les marqueurs de suppression n'ont pas d'entrée -> restent tels quels."""
        for token, surface in self._mapping.items():
            text = text.replace(token, surface)
        return text

    def restore_deep(self, node):
        """Restaure dans TOUTES les chaînes d'une structure JSON de réponse.

        La v1 ne restaurait que `choices[].message.content`. Le premier appel
        réel (2026-08-06) a montré que le texte vit à plusieurs endroits de la
        réponse : `reasoning`, `reasoning_details[].text`, et — Hermes étant un
        agent — `tool_calls[].function.arguments`. Ces champs revenaient au
        client avec `[NOM_1]`/`[TEL_1]` bruts : réponse fausse côté agent, et
        un outil exécuté avec un jeton en argument.

        Appliquer la restauration partout est SÛR : elle ne remplace que les
        jetons exacts que *cette* instance a elle-même émis (portée requête).
        Une chaîne qui n'en contient aucun ressort inchangée, et les marqueurs
        de suppression pure n'ont toujours pas d'entrée dans la table.
        """
        if isinstance(node, str):
            return self.restore(node)
        if isinstance(node, list):
            return [self.restore_deep(v) for v in node]
        if isinstance(node, dict):
            return {k: self.restore_deep(v) for k, v in node.items()}
        return node

    @property
    def mapping(self) -> dict[str, str]:
        return dict(self._mapping)


# --------------------------------------------------------------------------- #
#  Évaluation de risque (garde-fou fail-closed)
# --------------------------------------------------------------------------- #

# Marqueurs de « texte à secret professionnel ». Élargis le 2026-08-07 aux
# verticales ouvertes par §25 : la liste d'origine était **cliniquement
# française** et sa couverture était donc **nulle** pour avocats, notaires,
# banques, assureurs et comptables — c'est-à-dire pour l'essentiel de la
# famille « secret professionnel » à qui ce proxy est censé se vendre.
#
# ⚠️ Critère de sélection, à tenir si la liste s'élargit encore : un marqueur
# doit être **distinctif du métier**, pas seulement fréquent dans ses documents.
# `client`, `dossier`, `contrat`, `facture` sont écartés délibérément : ils
# rendraient `looks_sensitive` vrai sur presque tout texte professionnel, donc
# armeraient le fail-closed en permanence. Un garde-fou qui bloque tout est
# désarmé le lendemain — le sur-filtrage se paie en confiance, pas en sécurité.
_SENSITIVE_MARKERS = re.compile(
    r"\b("
    # — santé (liste d'origine)
    r"patient|patiente|diagnostic|ordonnance|acuit[ée]|ophtalmo|"
    r"tension|glyc[ée]mie|traitement|posologie|dossier\s+m[ée]dical|"
    # — droit / notariat
    r"assignation|jugement|tribunal|greffe|huissier|notaire|plaidoirie|"
    r"comparution|succession|testament|procuration|mise\s+en\s+demeure|"
    r"prud'?hommes|proc[èe]s-verbal|acte\s+notari[ée]|"
    # — banque / assurance
    r"IBAN|RIB|sinistre|[ée]ch[ée]ancier|souscripteur|b[ée]n[ée]ficiaire|"
    r"indemnisation|mainlev[ée]e|nantissement|police\s+d'assurance|"
    # — comptabilité / social
    r"NINEA|bulletin\s+de\s+(?:paie|salaire)|d[ée]claration\s+fiscale|"
    r"liasse\s+fiscale|grand\s+livre|"
    # — marqueurs d'identité, tous métiers confondus
    # ⚠️ « née? le » exige l'ACCENT, délibérément : écrit `n[ée]e?\s+le`, il
    # matcherait « ne le » — la négation française la plus courante — et
    # armerait le garde-fou sur presque tout texte. Le coût du choix : un
    # « ne le » sans accent n'est pas vu ; `date de naissance` reste le
    # marqueur robuste pour ce cas.
    r"date\s+de\s+naissance|née?\s+le|domicili[ée]"
    r")\b",
    re.IGNORECASE,
)

# Densité d'entités attendue dans un texte reconnu sensible : au moins une
# entité par tranche de N caractères. Voir `assess_risk` pour le raisonnement.
DEFAULT_CHARS_PER_ENTITY = 500

# En deçà, le texte est trop court pour qu'une densité veuille dire quoi que ce
# soit (valeur héritée de la v1, conservée telle quelle).
_MIN_TEXT_LENGTH = 120


@dataclass(frozen=True)
class RiskAssessment:
    looks_sensitive: bool
    entity_count: int
    # True quand le texte a l'air sensible mais que la détection est étonnamment
    # maigre : signal d'un possible faux négatif. La couche HTTP décide quoi en
    # faire (bloquer = fail-closed, ou logguer ailleurs).
    suspicious_low_detection: bool
    # Ce que la densité faisait attendre — journalisable, et rend le blocage
    # explicable au locataire (« 3 entités attendues, 1 détectée »).
    expected_entity_count: int


def expected_entities(n_chars: int, chars_per_entity: int = DEFAULT_CHARS_PER_ENTITY) -> int:
    """Nombre minimal d'entités attendu dans un texte sensible de `n_chars`."""
    if chars_per_entity <= 0:
        return 1
    return max(1, n_chars // chars_per_entity)


def assess_risk(
    text: str,
    entities: list[Entity],
    *,
    chars_per_entity: int = DEFAULT_CHARS_PER_ENTITY,
) -> RiskAssessment:
    """Signale un texte sensible dont la détection paraît anormalement maigre.

    🔴 La v1 testait `n == 0` : **une seule** entité — une date suffisait —
    désarmait le garde-fou sur un texte par ailleurs bourré de noms non
    reconnus. C'est exactement le scénario que §24 pt 4 désigne comme pire
    qu'une absence de proxy assumée : *« un proxy PII qui laisse passer 5 % des
    identifiants donne une fausse sécurité »*.

    On passe donc à un **seuil relatif à la longueur** : plus le texte est
    long, plus on attend d'entités. Propriété voulue — sous 1000 caractères le
    seuil vaut 1, donc le comportement est **identique à la v1** ; le
    durcissement ne mord que sur les textes longs, ceux où un faux négatif
    massif peut se cacher.

    ⚠️ `DEFAULT_CHARS_PER_ENTITY` est une **heuristique non calibrée** : aucun
    corpus réel n'a servi à l'établir. Elle est réglable par
    `PII_CHARS_PER_ENTITY` et doit être révisée sur des faux positifs
    réellement observés — jamais élargie « au cas où » (§53, même doctrine que
    le filtre de faux positifs du NER).
    """
    looks = bool(_SENSITIVE_MARKERS.search(text))
    n = len(entities)
    attendu = expected_entities(len(text), chars_per_entity)
    suspicious = looks and len(text) > _MIN_TEXT_LENGTH and n < attendu
    return RiskAssessment(looks, n, suspicious, attendu)
