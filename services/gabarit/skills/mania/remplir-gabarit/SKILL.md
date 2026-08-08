---
name: remplir-gabarit
description: Produit un document formaté (facture, rapport, attestation, courrier…) à partir d'un GABARIT à champs (docx/xlsx/pptx) rempli avec des données, via le service MANIA — avec conversion PDF optionnelle. À utiliser quand un modèle existe et qu'il faut le remplir, plutôt que de générer un document de zéro.
version: 1.1.0
metadata:
  hermes:
    tags: [documents, gabarit, template, facture, rapport, pdf, mania]
    category: mania
---

# Remplir un gabarit (service MANIA)

## Overview
Quand un **modèle** existe (une facture type, un rapport type…), il est plus fiable de le
**remplir** que de régénérer un document de zéro. Le service MANIA, joignable à l'adresse
portée par `$MANIA_DOCUMENTS_URL` (endpoint `/v1/fill`), prend un gabarit + des données JSON
et renvoie le document rempli, avec **conversion optionnelle** en PDF. **Utilise toujours la
variable, jamais une adresse écrite en clair** : selon le locataire, le service se joint par
un nom public ou par un nom interne.
- Gabarit **docx** : champs au format Jinja2 — `{{ variable }}`, boucles `{% for x in liste %}…
  {% endfor %}`, conditions `{% if %}`. Le plus riche (factures avec lignes, rapports).
- Gabarit **xlsx / pptx** : champs simples `{{clé}}` dans les cellules / le texte.
Le jeton `$SHARED_SERVICES_TOKEN` est déjà dans l'environnement — ne jamais le demander.

## When to Use
- L'utilisateur veut un document **formaté à partir d'un modèle** : « établis une facture »,
  « génère l'attestation », « remplis le rapport type avec ces chiffres ».
- Un gabarit adapté existe (dans le workspace, fourni par le client ou créé précédemment).
- Si **aucun gabarit** n'existe encore et que l'utilisateur veut un rendu précis récurrent,
  propose d'en **créer un** (docx avec des `{{champs}}`) et de le conserver dans le workspace
  pour les prochaines fois.
- Pour une simple **conversion de format** (pas de remplissage), utilise plutôt la skill
  `convertir-document`.

## Procedure
1. Repère le **gabarit** (chemin du fichier `.docx`/`.xlsx`/`.pptx`) et, si besoin, **inspecte
   ses champs** : pour un docx, tu peux lister ses `{{...}}` en lisant son texte
   (`unzip -p GABARIT word/document.xml | grep -o '{{[^}]*}}'`).
2. Construis les **données** en JSON (un objet), avec une clé par champ du gabarit. Exemple :
   `{"client":"Cabinet Diop","montant":150000,"date":"2026-08-02","lignes":[{"designation":"Consultation","prix":50000}]}`.
3. Appelle le service (mets `to=pdf` pour obtenir directement un PDF) :
   ```sh
   curl -sS -w '\nHTTP %{http_code}\n' -X POST "${MANIA_DOCUMENTS_URL:-https://documents.mania.sn}/v1/fill" \
     -H "Authorization: Bearer $SHARED_SERVICES_TOKEN" \
     -F "template=@CHEMIN_GABARIT" \
     -F 'data=JSON_DONNEES' \
     -F "to=pdf" \
     -o CHEMIN_SORTIE
   ```
   (Omets `-F "to=pdf"` pour garder le format du gabarit.) Laisse
   `${MANIA_DOCUMENTS_URL:-…}` tel quel : le shell le résout.
4. Lis le **code HTTP** : `200` = succès. Sinon (`400` données/gabarit invalides, `413` trop
   volumineux, `422` remplissage/conversion échoués, `504` trop long), `CHEMIN_SORTIE` contient
   un message JSON : lis-le (`cat CHEMIN_SORTIE`) et explique le problème.
5. Remets le document à l'utilisateur.

## Common Pitfalls
- **Ne demande jamais le jeton** : `$SHARED_SERVICES_TOKEN` est dans l'environnement.
- **N'écris jamais l'adresse du service en dur.** Si `curl` répond « could not resolve host »
  ou n'aboutit pas, ce n'est pas une panne du service : c'est que l'adresse a été recopiée au
  lieu d'être laissée sous forme de variable. Vérifie avec `echo "$MANIA_DOCUMENTS_URL"`.
- Les clés du JSON doivent **correspondre exactement** aux `{{champs}}` du gabarit. Un champ
  absent des données est laissé tel quel dans le document (xlsx/pptx) — vérifie l'orthographe.
- Le service **ne crée pas** de gabarit ; il remplit un modèle existant. Pour un nouveau modèle,
  crée un `.docx` avec des `{{champs}}` (et des boucles Jinja2 si listes) puis conserve-le.
- `data` doit être un **objet JSON** (`{...}`), pas une liste ni une valeur seule.
- Le remplissage docx est en **bac à sable** : les gabarits ne peuvent pas exécuter de code
  (c'est voulu).

## Verification Checklist
- [ ] Le code affiché est `HTTP 200`.
- [ ] `CHEMIN_SORTIE` existe et sa taille est non nulle (`ls -l CHEMIN_SORTIE`).
- [ ] `file CHEMIN_SORTIE` indique le type attendu (« PDF document » si `to=pdf`).
- [ ] À l'ouverture, les `{{champs}}` ont bien été remplacés par les données.
