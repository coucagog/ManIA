"""
presidio_adapter.py — Branche Microsoft Presidio derrière l'interface `Detector`.

Chargé UNIQUEMENT sur le VPS (Presidio + spaCy small y sont installés). En son
absence, main.py tourne en regex-seul et reste fail-closed via assess_risk.

⚠️ spaCy small rate (§16) : ce module ne porte QUE les noms/adresses libres. Les
identifiants structurés (téléphone, dossier, CB, CNI, e-mail, date) sont couverts
par RegexDetector, plus fiable. C'est ici qu'on ajoutera les reconnaisseurs de
terrain (noms sénégalais, wolof translittéré) — travail itératif, cf. §24.
"""

from __future__ import annotations

import logging
import os

from pii_engine import Entity

# --------------------------------------------------------------------------- #
#  Modèle spaCy : `md` par défaut depuis le §57
#
#  Choix pris SUR MESURE, pas par principe. Banc de 30 phrases professionnelles
#  sénégalaises (noms wolof/peul, quartiers de Dakar, villes) :
#
#                       fr_core_news_sm      fr_core_news_md
#      rappel NOM            80 %                100 %
#      rappel ADRESSE        59 %                 82 %
#      faux positifs           3                    2
#      RSS en régime        294 Mo               485 Mo   (mem_limit : 1536 Mo)
#      CPU (28 complétions)  37,9 s               40,1 s
#
#  `sm` ratait « Mamadou Lamine Sarr », « Ibrahima Fall », « Serigne Modou
#  Kane » — des patronymes ordinaires ici. C'est le §24 pt 4 en pratique : un
#  proxy qui laisse passer les noms de ses propres clients donne une fausse
#  sécurité. Le prix est +191 Mo et +5 % de CPU, largement payé par les
#  correctifs du même §57 (37,9 s -> 1,1 s).
#
#  ⚠️ Ce banc est écrit à la main, il n'est PAS un corpus validé : il tranche
#  `sm` contre `md`, il ne certifie aucun taux de couverture. Les
#  reconnaisseurs sénégalais dédiés restent le TODO du §24.
#
#  /!\ Le modèle doit être présent dans l'image (cf. Dockerfile) : le conteneur
#  n'a aucun egress au runtime (patron §36).
# --------------------------------------------------------------------------- #
SPACY_MODEL = os.environ.get("PII_SPACY_MODEL", "fr_core_news_md")

# Composants spaCy réellement utilisés pour produire PERSON/LOCATION.
_COMPOSANTS_UTILES = frozenset({"tok2vec", "ner"})

FULL_PIPELINE = os.environ.get("PII_SPACY_FULL_PIPELINE", "0") == "1"

# spaCy `fr_core_news_sm` produit un label MISC que Presidio ne sait pas mapper.
# Il journalise alors un WARNING **par entite rencontree** : concretement des
# CENTAINES de lignes identiques par requete, qui noient les lignes utiles
# (PROBE, statuts HTTP) et remplissent le disque du VPS. Constate en prod le
# 2026-08-06 pendant la sonde.
# Couper ce logger est sans risque ici : MISC n'est de toute facon pas dans
# _PRESIDIO_TO_MANIA, donc `detect()` l'ignore deja a la sortie. L'alternative
# documentee (NerModelConfiguration.labels_to_ignore) n'est pas retenue : elle
# depend de la version de Presidio installee, et on ne peut pas la verifier
# hors du VPS.
logging.getLogger("presidio-analyzer").setLevel(logging.ERROR)

# Mappe les types Presidio -> nos types internes. Seuls les types utiles au
# NER libre sont retenus ; le reste est déjà couvert (et mieux) par le regex.
_PRESIDIO_TO_MANIA = {
    "PERSON": "NOM",
    "LOCATION": "ADRESSE",
}

# --------------------------------------------------------------------------- #
#  Faux positifs du NER français — première passe du travail de terrain de §24
#
#  Constaté au premier appel réel (2026-08-06) : « Ecris un mot pour Fatou
#  Ndiaye » est parti à l'amont en « [NOM_1] un mot pour [NOM_2] ». Le VERBE a
#  été étiqueté PERSON par `fr_core_news_sm` — un mot capitalisé en tête de
#  phrase, cas d'école du modèle small (§16). Résultat : le modèle a reçu une
#  instruction sans verbe et a répondu à côté.
#
#  ⚠️ Un filtre de ce genre RÉDUIT la couverture : quelqu'un qui s'appellerait
#  « Note » ne serait plus masqué. C'est assumé — la liste ne contient que des
#  verbes d'instruction et des formules d'adresse, jamais un patronyme
#  plausible au Sénégal. On ne l'élargira qu'à partir de faux positifs
#  RÉELLEMENT observés, jamais par anticipation : sur-filtrer ici, c'est
#  rouvrir §24 pt 4 (« un proxy qui laisse passer donne une fausse sécurité »).
# --------------------------------------------------------------------------- #
_FAUX_POSITIFS_NOM = {
    # verbes d'instruction, très souvent en tête de message
    "ecris", "écris", "ecrire", "écrire", "redige", "rédige", "rediger", "rédiger",
    "resume", "résume", "resumer", "résumer", "traduis", "traduire", "corrige",
    "corriger", "explique", "expliquer", "analyse", "analyser", "liste", "lister",
    "propose", "proposer", "envoie", "envoyer", "prepare", "prépare", "preparer",
    "préparer", "note", "noter", "verifie", "vérifie", "cherche", "trouve",
    "ajoute", "supprime", "modifie", "genere", "génère", "creer", "créer", "cree",
    "crée", "donne", "montre", "dis", "fais", "peux", "peut",
    # formules d'adresse et civilités
    "bonjour", "bonsoir", "salut", "merci", "cordialement", "objet",
    "madame", "monsieur", "mademoiselle", "docteur", "maitre", "maître",
    "cher", "chere", "chère", "chers", "cheres", "chères",
}


def est_faux_positif_nom(surface: str) -> bool:
    """Vrai si cette surface ne doit PAS être retenue comme une entité NER.

    Fonction pure et sans dépendance Presidio -> testable hors-ligne, comme le
    cœur (`test_pii_engine.py`). C'est voulu : c'est la seule partie de ce
    module dont on peut prouver le comportement sans le VPS.

    /!\\ S'applique aux DEUX types issus du NER, pas au seul NOM — voir
    `PresidioDetector.detect`.
    """
    return surface.strip().lower() in _FAUX_POSITIFS_NOM


# Types issus du NER, donc sujets au filtre ci-dessus. Les identifiants
# structurés (TEL, EMAIL, CB, CNI, DATE, DOSSIER) viennent de RegexDetector et
# ne passent jamais par ici.
_TYPES_NER = frozenset({"NOM", "ADRESSE"})


class PresidioDetector:
    """Enveloppe l'AnalyzerEngine de Presidio. Instancié une fois (modèle chargé
    une seule fois : c'est l'argument du conteneur PARTAGÉ, cf. §16)."""

    def __init__(self, language: str = "fr") -> None:
        # Import différé : n'échoue pas à l'import du module si Presidio manque.
        from presidio_analyzer import AnalyzerEngine
        from presidio_analyzer.nlp_engine import NlpEngineProvider

        provider = NlpEngineProvider(nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "fr", "model_name": SPACY_MODEL}],
        })
        engine = provider.create_engine()

        # --- Pipeline réduit au strict nécessaire (§57) ----------------------
        # `fr_core_news_md` est chargé COMPLET par défaut : tok2vec,
        # morphologizer, parser, attribute_ruler, lemmatizer, ner. Or on ne lui
        # demande que PERSON et LOCATION, qui sortent du seul composant `ner` ;
        # l'analyse syntaxique et la lemmatisation sont calculées puis jetées.
        # Mesuré sur banc (28 complétions) : 1,8 s -> 1,1 s, et l'équivalence
        # des entités détectées a été vérifiée sur le même texte.
        #
        # /!\ Réversible sans rebuild : PII_SPACY_FULL_PIPELINE=1 restaure le
        # pipeline complet. C'est le filet si une version future de Presidio
        # se met à lire les lemmes pour un reconnaisseur qu'on aurait activé —
        # même prudence que le refus de `labels_to_ignore` plus haut.
        if not FULL_PIPELINE:
            nlp = engine.nlp[language]
            inutiles = [p for p in nlp.pipe_names if p not in _COMPOSANTS_UTILES]
            if inutiles:
                nlp.disable_pipes(*inutiles)

        self._analyzer = AnalyzerEngine(
            nlp_engine=engine,
            supported_languages=["fr"],
        )
        self._language = language
        self._register_custom_recognizers()

    def _register_custom_recognizers(self) -> None:
        """Point d'ajout des reconnaisseurs sénégalais (noms, formats locaux,
        wolof translittéré). TODO §24 — travail de terrain, pas une install."""
        # Exemple de squelette (à peupler à partir de textes réels anonymisés) :
        # from presidio_analyzer import PatternRecognizer, Pattern
        # self._analyzer.registry.add_recognizer(PatternRecognizer(
        #     supported_entity="PERSON",
        #     deny_list=[...noms fréquents...],
        #     supported_language="fr",
        # ))
        pass

    def detect(self, text: str) -> list[Entity]:
        results = self._analyzer.analyze(
            text=text,
            language=self._language,
            entities=list(_PRESIDIO_TO_MANIA.keys()),
        )
        out: list[Entity] = []
        for r in results:
            mania_type = _PRESIDIO_TO_MANIA.get(r.entity_type)
            if not mania_type:
                continue
            surface = text[r.start:r.end]
            # 🔴 §57 : ce filtre ne gardait que le chemin NOM. Mesuré sur banc,
            # `fr_core_news_sm` étiquette « Redige » en **LOCATION** — donc
            # ADRESSE — et « Redige la synthèse du grand livre » partait à
            # l'amont en « [ADRESSE_1] la synthèse du grand livre ». C'est
            # exactement la panne du §53 (l'agent reçoit une instruction sans
            # verbe), par l'autre chemin, restée ouverte parce que la condition
            # nommait un type au lieu de nommer la FAMILLE de types concernée.
            if mania_type in _TYPES_NER and est_faux_positif_nom(surface):
                continue
            out.append(Entity(mania_type, r.start, r.end, surface))
        return out
