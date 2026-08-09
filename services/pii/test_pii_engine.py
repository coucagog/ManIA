"""
Tests hors-ligne du cœur PII. Aucune dépendance réseau ni Presidio : un faux
détecteur NER fournit les noms, le reste est déterministe. Reproduit le patron
STACK-3 « prouvé hors-ligne avant intégration prod ».

Lancer :  python3 test_pii_engine.py
"""

from __future__ import annotations

import json

from pii_engine import (
    _CACHE_MIN_CHARS,
    CachedDetector,
    CompositeDetector,
    Entity,
    Pseudonymizer,
    RegexDetector,
    assess_risk,
    luhn_ok,
    resolve_overlaps,
)


class FakeNerDetector:
    """Simule Presidio : marque des noms fournis d'avance (insensible à la casse
    n'est PAS géré ici volontairement — on teste la casse exacte de v1)."""

    def __init__(self, names: list[str]) -> None:
        self._names = names

    def detect(self, text: str) -> list[Entity]:
        out: list[Entity] = []
        for name in self._names:
            start = 0
            while True:
                i = text.find(name, start)
                if i == -1:
                    break
                out.append(Entity("NOM", i, i + len(name), name))
                start = i + len(name)
        return out


def _engine(names: list[str] | None = None) -> Pseudonymizer:
    det = CompositeDetector([RegexDetector(), FakeNerDetector(names or [])])
    return Pseudonymizer(det)


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


# --------------------------------------------------------------------------- #

def test_reversible_roundtrip():
    print("\n[1] Round-trip réversible (nom, date, dossier, tel, email)")
    text = (
        "Mme Fatou Ndiaye, née le 12/03/1978, dossier 44821, "
        "joignable au +221 77 714 46 38 ou zeyna@example.sn."
    )
    eng = _engine(["Fatou Ndiaye"])
    masked = eng.pseudonymize(text)
    print("    masqué  :", masked)
    check("le nom réel a disparu du texte masqué", "Fatou Ndiaye" not in masked)
    check("la date réelle a disparu", "12/03/1978" not in masked)
    check("le téléphone réel a disparu", "77 714 46 38" not in masked)
    check("l'e-mail réel a disparu", "zeyna@example.sn" not in masked)
    check("un jeton nom est présent", "[NOM_1]" in masked)
    restored = eng.restore(masked)
    check("restauration = texte d'origine", restored == text)


def test_redaction_is_not_restorable():
    print("\n[2] Suppression pure : CB et CNI jamais transmises ni restaurables")
    # 4111 1111 1111 1111 est un numéro de test Luhn-valide.
    text = "Paiement par carte 4111 1111 1111 1111. CNI n° 1234567890123."
    eng = _engine()
    masked = eng.pseudonymize(text)
    print("    masqué  :", masked)
    check("le numéro de CB a disparu du texte masqué",
          "4111 1111 1111 1111" not in masked)
    check("le numéro de CNI a disparu du texte masqué",
          "1234567890123" not in masked)
    check("marqueur de suppression présent", "[SUPPRIMÉ]" in masked)
    check("CB absente de la table de correspondance",
          all("4111" not in v for v in eng.mapping.values()))
    check("CNI absente de la table de correspondance",
          all("1234567890123" not in v for v in eng.mapping.values()))
    restored = eng.restore(masked)
    check("restore NE ramène PAS la CB (irréversible)",
          "4111 1111 1111 1111" not in restored)
    check("restore NE ramène PAS la CNI (irréversible)",
          "1234567890123" not in restored)


def test_consistency():
    print("\n[3] Cohérence intra-requête : même valeur -> même jeton")
    text = "Dupont a appelé. Rappeler Dupont demain. Nouveau contact : Sarr."
    eng = _engine(["Dupont", "Sarr"])
    masked = eng.pseudonymize(text)
    print("    masqué  :", masked)
    check("Dupont -> un seul jeton réutilisé", masked.count("[NOM_1]") == 2)
    check("Sarr -> jeton distinct", "[NOM_2]" in masked)


def test_overlap_cb_vs_phone():
    print("\n[4] Chevauchement : une CB Luhn-valide n'est pas prise pour un tel")
    text = "Réf paiement 4111 1111 1111 1111 reçu."
    eng = _engine()
    masked = eng.pseudonymize(text)
    print("    masqué  :", masked)
    check("classée CB (supprimée), pas TEL (réversible)",
          "[SUPPRIMÉ]" in masked and "[TEL_1]" not in masked)


def test_phone_formats():
    print("\n[5] Formats de téléphone sénégalais")
    eng = _engine()
    for raw in ["+221 77 714 46 38", "77 714 46 38", "77-714-46-38",
                "778 714 638".replace(" ", ""), "00221 33 889 00 00"]:
        det = RegexDetector().detect(f"appel {raw} ok")
        got = any(e.type == "TEL" for e in det)
        check(f"détecté : {raw!r}", got)


def test_openai_body_rewrite():
    print("\n[6] Réécriture d'un corps /v1/chat/completions (non-streaming)")
    body = {
        "model": "anthropic/claude-opus-4.8",
        "messages": [
            {"role": "system", "content": "Tu es un assistant médical."},
            {"role": "user", "content":
                "Rédige un courrier pour Fatou Ndiaye (dossier 44821)."},
        ],
    }
    eng = _engine(["Fatou Ndiaye"])
    # Une seule table pour toute la requête -> jetons cohérents entre messages.
    for msg in body["messages"]:
        msg["content"] = eng.pseudonymize(msg["content"])
    sent = json.dumps(body, ensure_ascii=False)
    print("    envoyé  :", sent)
    check("aucun nom réel ne part vers l'amont", "Fatou Ndiaye" not in sent)
    check("aucun n° de dossier réel ne part", "44821" not in sent)

    # L'amont (simulé) renvoie une réponse qui réutilise les jetons.
    upstream_reply = {
        "choices": [{"message": {"role": "assistant", "content":
            "Courrier pour [NOM_1] concernant le dossier [DOSSIER_1]."}}]
    }
    reply = upstream_reply["choices"][0]["message"]["content"]
    restored = eng.restore(reply)
    print("    rendu   :", restored)
    check("le nom réel est ré-inséré côté agent",
          "Fatou Ndiaye" in restored)
    check("le n° de dossier réel est ré-inséré", "44821" in restored)


def test_fail_closed_signal():
    print("\n[7] Garde-fou : texte clinique + détection nulle -> signal suspect")
    text = ("Le patient présente une baisse d'acuité visuelle depuis trois "
            "semaines, avec un fond d'oeil normal et une tension oculaire "
            "dans les limites ; traitement en cours à réévaluer prochainement.")
    eng = _engine()  # pas de nom fourni -> le NER "rate" tout
    ents = resolve_overlaps(eng.detector.detect(text))
    risk = assess_risk(text, ents)
    check("texte reconnu comme sensible", risk.looks_sensitive)
    check("faux négatif suspecté (fail-closed peut bloquer)",
          risk.suspicious_low_detection)

    # Contrôle : un texte anodin ne déclenche pas le signal.
    benign = "Peux-tu me résumer les points clés de cette réunion, merci."
    r2 = assess_risk(benign, resolve_overlaps(eng.detector.detect(benign)))
    check("texte anodin -> pas de signal", not r2.suspicious_low_detection)


def test_luhn():
    print("\n[8] Luhn (contrôle unitaire)")
    check("4111 1111 1111 1111 valide", luhn_ok("4111111111111111"))
    check("1234 5678 9012 3456 invalide", not luhn_ok("1234567890123456"))


def test_restore_deep():
    print("\n[9] Restauration PROFONDE (reasoning, tool_calls) — constat prod 2026-08-06")
    eng = _engine(["Fatou Ndiaye"])
    masque = eng.pseudonymize("Ecris un mot pour Fatou Ndiaye, joignable au 77 710 40 30")
    check("le nom réel ne part pas à l'amont", "Fatou Ndiaye" not in masque)

    # Forme réellement renvoyée par OpenRouter : le texte vit à quatre endroits.
    reponse = {
        "role": "assistant",
        "content": "Voici le mot pour [NOM_1].",
        "reasoning": "L'utilisateur veut un mot pour [NOM_1] au [TEL_1].",
        "reasoning_details": [{"type": "reasoning.text", "text": "[NOM_1] / [TEL_1]"}],
        "tool_calls": [{"function": {"arguments": '{"tel":"[TEL_1]"}'}}],
        "refusal": None,
    }
    out = eng.restore_deep(reponse)
    check("content restauré", "Fatou Ndiaye" in out["content"])
    check("reasoning restauré", "Fatou Ndiaye" in out["reasoning"])
    check("reasoning_details restauré", "77 710 40 30" in out["reasoning_details"][0]["text"])
    check("arguments d'outil restaurés",
          "77 710 40 30" in out["tool_calls"][0]["function"]["arguments"])
    check("les valeurs None traversent sans dommage", out["refusal"] is None)
    check("aucun jeton résiduel", "[NOM_1]" not in str(out) and "[TEL_1]" not in str(out))

    # Une réponse sans aucun jeton doit ressortir strictement identique.
    neutre = {"content": "Bonjour, c'est note.", "n": 3, "ok": True}
    check("réponse sans jeton inchangée", eng.restore_deep(neutre) == neutre)


def test_faux_positifs_ner():
    print("\n[10] Filtre des faux positifs du NER français (« Ecris » -> [NOM_1])")
    # presidio_adapter s'importe sans Presidio (import différé dans __init__).
    from presidio_adapter import est_faux_positif_nom
    check("'Ecris' rejeté comme nom", est_faux_positif_nom("Ecris"))
    check("'Rédige' rejeté (accentué)", est_faux_positif_nom("Rédige"))
    check("'Bonjour' rejeté", est_faux_positif_nom("Bonjour"))
    check("espaces en trop tolérés", est_faux_positif_nom("  Ecris "))
    check("'Fatou Ndiaye' CONSERVÉ", not est_faux_positif_nom("Fatou Ndiaye"))
    check("'Ndiaye' CONSERVÉ", not est_faux_positif_nom("Ndiaye"))
    check("'Diop' CONSERVÉ", not est_faux_positif_nom("Diop"))


def test_seuil_relatif_et_marqueurs():
    print("\n[11] Garde-fou durci : seuil relatif + marqueurs élargis (§54)")
    from pii_engine import expected_entities

    # -- Le seuil relatif ---------------------------------------------------
    check("sous 1000 caractères, le seuil vaut 1 (comportement v1 conservé)",
          expected_entities(120) == 1 and expected_entities(999) == 1)
    check("2000 caractères -> 4 entités attendues", expected_entities(2000) == 4)

    # 🔴 Le scénario que la v1 laissait passer : un texte long et sensible où
    # UNE SEULE entité (ici une date) suffisait à désarmer le garde-fou.
    long_texte = (
        "Compte rendu de consultation du patient reçu ce jour, né le 12/03/1978. "
        + "L'examen clinique retrouve les éléments habituels du dossier. " * 30
    )
    eng = _engine()  # NER muet -> seule la regex détecte (la date)
    ents = resolve_overlaps(eng.detector.detect(long_texte))
    risk = assess_risk(long_texte, ents)
    check("le texte long est reconnu sensible", risk.looks_sensitive)
    check("détection maigre sur texte long -> suspect (v1 ne voyait rien)",
          risk.suspicious_low_detection)
    check("le nombre attendu est exposé pour le journal",
          risk.expected_entity_count == expected_entities(len(long_texte)))
    check("le seuil est réglable", not assess_risk(
        long_texte, ents, chars_per_entity=100_000).suspicious_low_detection)

    # -- Non-régression : le texte court de la v1 se comporte pareil ---------
    # Longueur tenue entre 121 et 499 caractères : au-dessus de _MIN_TEXT_LENGTH
    # pour que le garde-fou s'applique, en dessous de la première tranche pour
    # que le seuil vaille encore 1 (c'est ce qui rend la comparaison à la v1
    # valide).
    court = ("Le patient présente une baisse d'acuité visuelle depuis trois "
             "semaines, avec un fond d'oeil normal et une tension oculaire "
             "dans les limites ; contrôle prévu dans trois mois.")
    check("le texte de contrôle est bien dans la première tranche",
          120 < len(court) < 500)
    check("texte court sans entité -> toujours suspect",
          assess_risk(court, []).suspicious_low_detection)
    check("texte court AVEC une entité -> plus suspect (seuil = 1)",
          not assess_risk(court, [Entity("DATE", 0, 1, "x")]).suspicious_low_detection)

    # -- Les verticales de §25, dont la couverture était nulle --------------
    for mot, verticale in [
        ("mise en demeure", "droit"), ("huissier", "droit"),
        ("succession", "notariat"), ("IBAN", "banque"),
        ("sinistre", "assurance"), ("bulletin de paie", "social"),
        ("NINEA", "comptabilité"), ("née le", "identité"),
    ]:
        phrase = f"Objet : {mot}. " + "Suite de la correspondance en cours. " * 5
        check(f"« {mot} » ({verticale}) reconnu sensible",
              assess_risk(phrase, []).looks_sensitive)

    # -- Et ce qu'on a délibérément REFUSÉ d'ajouter -------------------------
    # Trop génériques : ils armeraient le fail-closed sur presque tout texte
    # professionnel, et un garde-fou qui bloque tout est désarmé le lendemain.
    banal = ("Peux-tu preparer le devis pour le client, avec le contrat et la "
             "facture correspondante, puis classer le tout dans le dossier. " * 3)
    check("un texte commercial banal n'arme pas le garde-fou",
          not assess_risk(banal, []).looks_sensitive)

    # 🔴 Non-régression sur un piège trouvé en relecture : écrit `n[ée]e?\s+le`,
    # le marqueur d'identité aurait matché « ne le » — la négation française la
    # plus courante — et rendu TOUT texte sensible. L'accent est exigé.
    negation = ("Le fournisseur ne le livrera pas avant lundi ; je ne le "
                "relancerai qu'en fin de semaine, il ne le sait pas encore.")
    check("« ne le » (négation) n'arme pas le garde-fou",
          not assess_risk(negation, []).looks_sensitive)
    check("« née le » (accentué) reste reconnu",
          assess_risk("La cliente, née le 12/03/1978, nous a écrit.", []).looks_sensitive)


# Doit depasser _CACHE_MIN_CHARS : sous ce seuil, CachedDetector ne cache RIEN,
# et un test ecrit trop court passerait A VIDE sans rien prouver — c'est
# exactement ce qui s'est produit a la premiere ecriture de ces tests.
_TEXTE_CACHABLE = (
    "Le patient Amadou Diallo, ne le 12/03/1978, joignable au 77 123 45 67 et "
    "a amadou.diallo@example.sn, reside a Dakar depuis 2019. Son dossier "
    "2024-118 comporte une ordonnance ainsi qu'un compte rendu de consultation "
    "faisant etat d'une acuite reduite, et le traitement a ete reconduit."
)
assert len(_TEXTE_CACHABLE) > _CACHE_MIN_CHARS, \
    "texte de test trop court pour etre mis en cache — le test passerait a vide"


class CountingDetector:
    """Detecteur qui compte ses appels — pour prouver la memoisation."""

    def __init__(self, inner) -> None:
        self._inner = inner
        self.appels = 0

    def detect(self, text: str) -> list[Entity]:
        self.appels += 1
        return self._inner.detect(text)


def test_apply_equivaut_a_pseudonymize():
    """`apply` (entites fournies) doit rendre EXACTEMENT ce que rend
    `pseudonymize` (entites redetectees). C'est la garantie que la suppression
    de la passe en double (§57) n'a rien change au texte envoye a l'amont."""
    texte = ("Amadou Diallo, ne le 12/03/1978, dossier 2024-118, "
             "tel 77 123 45 67, amadou@example.sn, CB 4539 1488 0343 6467.")

    attendu = _engine(["Amadou Diallo"]).pseudonymize(texte)

    eng = _engine(["Amadou Diallo"])
    ents = resolve_overlaps(eng.detector.detect(texte))
    check("apply(entites) == pseudonymize(texte)", eng.apply(texte, ents) == attendu)

    # Et la table de correspondance doit etre la meme des deux cotes.
    ref = _engine(["Amadou Diallo"])
    ref.pseudonymize(texte)
    check("apply produit la meme table de correspondance",
          set(eng.mapping.values()) == set(ref.mapping.values()))


def test_cache_ne_stocke_aucune_surface():
    """Le cache ne doit contenir que des bornes — jamais une valeur reelle.

    C'est la condition qui rend la memoisation compatible avec la doctrine
    « rien n'est persiste » (STACK-3 §1) : un vidage memoire du cache ne rend
    aucune PII."""


    texte = _TEXTE_CACHABLE
    cache = CachedDetector(CompositeDetector([RegexDetector(), FakeNerDetector(["Amadou Diallo"])]))
    det = cache.scoped("cabinet-a")
    det.detect(texte)

    brut = repr(cache._cache)
    fuites = [v for v in ("Amadou Diallo", "77 123 45 67", "amadou.diallo@example.sn",
                          "2024-118", "12/03/1978") if v in brut]
    check("le cache ne contient aucune surface", not fuites)
    check("le cache contient bien des bornes", len(next(iter(cache._cache.values()))) > 0)


def test_cache_rend_le_meme_resultat_et_evite_le_recalcul():


    texte = _TEXTE_CACHABLE
    compteur = CountingDetector(
        CompositeDetector([RegexDetector(), FakeNerDetector(["Amadou Diallo"])]))
    cache = CachedDetector(compteur)
    det = cache.scoped("cabinet-a")

    premier = det.detect(texte)
    second = det.detect(texte)
    check("2e detection identique a la 1re",
          [(e.type, e.start, e.end, e.text) for e in premier]
          == [(e.type, e.start, e.end, e.text) for e in second])
    check("2e detection sans recalcul", compteur.appels == 1)
    check("les surfaces sont bien retranchees dans le texte",
          all(e.text == texte[e.start:e.end] for e in second))


def test_cache_cloisonne_par_locataire():
    """Un hit ne doit JAMAIS traverser deux locataires : sinon le temps de
    reponse dit au tenant B qu'un texte a deja ete soumis par le tenant A."""


    texte = _TEXTE_CACHABLE
    compteur = CountingDetector(
        CompositeDetector([RegexDetector(), FakeNerDetector(["Amadou Diallo"])]))
    cache = CachedDetector(compteur)

    cache.scoped("cabinet-a").detect(texte)
    cache.scoped("cabinet-b").detect(texte)
    check("un autre locataire ne beneficie pas du cache", compteur.appels == 2)
    check("aucun hit entre locataires", cache.hits == 0)


def test_cache_ignore_les_textes_courts():
    """Une empreinte de texte court est attaquable par force brute (un numero
    senegalais = 10^7 possibilites). Sous le seuil, on ne cache rien."""


    compteur = CountingDetector(CompositeDetector([RegexDetector()]))
    cache = CachedDetector(compteur)
    det = cache.scoped("cabinet-a")
    det.detect("77 123 45 67")
    det.detect("77 123 45 67")
    check("texte court : jamais mis en cache", cache._cache == {})
    check("texte court : recalcul a chaque fois", compteur.appels == 2)


def test_cache_borne_sa_taille():
    """VPS SANS SWAP : le cache doit avoir un plafond, pas une croissance libre."""


    cache = CachedDetector(CompositeDetector([RegexDetector()]), max_entries=3)
    det = cache.scoped("cabinet-a")
    for i in range(10):
        det.detect(f"Texte numero {i} " + "de remplissage sans identifiant. " * 8)
    check("le cache reste borne", len(cache._cache) <= 3)


def test_identifiants_encodes_en_json():
    """Un identifiant ancre sur mot-cle doit etre vu MEME encode en JSON.

    Regression du §57 : Hermes est un agent, sa charge utile vit dans
    `tool_calls[].function.arguments`, soit `"reference": "2024-118"`. Les
    motifs ne connaissaient que la prose et laissaient passer le numero de
    dossier ET le numero de CNI — ce dernier etant pourtant en SUPPRESSION
    PURE."""
    det = RegexDetector()

    def types(t: str) -> set[str]:
        return {e.type for e in det.detect(t)}

    check("dossier en prose (inchange)", "DOSSIER" in types("le dossier 2024-118 est ouvert"))
    check("dossier avec deux-points (inchange)", "DOSSIER" in types("reference : 2024-118"))
    check("dossier en JSON (guillemets doubles)",
          "DOSSIER" in types('{"reference": "2024-118", "client": "X"}'))
    check("dossier en JSON compact", "DOSSIER" in types('{"dossier":"2024-118"}'))
    check("dossier en guillemets simples", "DOSSIER" in types("{'ref': '2024-118'}"))
    check("CNI en prose (inchange)", "CNI" in types("CNI 1234567890123"))
    check("CNI en JSON", "CNI" in types('{"cni": "1234567890123"}'))

    # Le masquage doit reellement retirer la valeur du corps sortant.
    corps = '{"reference": "2024-118", "cni": "1234567890123"}'
    sortie = _engine().pseudonymize(corps)
    check("le dossier JSON ne sort plus en clair", "2024-118" not in sortie)
    check("la CNI JSON ne sort plus en clair", "1234567890123" not in sortie)
    check("la CNI reste non restaurable",
          "1234567890123" not in _engine().restore(sortie))


def main() -> int:
    test_reversible_roundtrip()
    test_redaction_is_not_restorable()
    test_consistency()
    test_overlap_cb_vs_phone()
    test_phone_formats()
    test_openai_body_rewrite()
    test_fail_closed_signal()
    test_luhn()
    test_restore_deep()
    test_faux_positifs_ner()
    test_seuil_relatif_et_marqueurs()
    test_apply_equivaut_a_pseudonymize()
    test_cache_ne_stocke_aucune_surface()
    test_cache_rend_le_meme_resultat_et_evite_le_recalcul()
    test_cache_cloisonne_par_locataire()
    test_cache_ignore_les_textes_courts()
    test_cache_borne_sa_taille()
    test_identifiants_encodes_en_json()
    print(f"\n===== {_PASS} ok, {_FAIL} FAIL =====")
    return 1 if _FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
