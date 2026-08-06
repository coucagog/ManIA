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

from pii_engine import Entity

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


class PresidioDetector:
    """Enveloppe l'AnalyzerEngine de Presidio. Instancié une fois (modèle chargé
    une seule fois : c'est l'argument du conteneur PARTAGÉ, cf. §16)."""

    def __init__(self, language: str = "fr") -> None:
        # Import différé : n'échoue pas à l'import du module si Presidio manque.
        from presidio_analyzer import AnalyzerEngine
        from presidio_analyzer.nlp_engine import NlpEngineProvider

        provider = NlpEngineProvider(nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "fr", "model_name": "fr_core_news_sm"}],
        })
        self._analyzer = AnalyzerEngine(
            nlp_engine=provider.create_engine(),
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
            out.append(Entity(mania_type, r.start, r.end, text[r.start:r.end]))
        return out
