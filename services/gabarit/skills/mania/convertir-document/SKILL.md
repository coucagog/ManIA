---
name: convertir-document
description: Convertit un document bureautique (Word, Excel, PowerPoint, OpenDocument, HTML, CSV, RTF) vers un autre format, PDF compris, via le service MANIA. À utiliser dès que l'utilisateur demande une conversion de format (par ex. docx→pdf, xlsx→pdf, html→pdf) ou pour livrer un document produit sous forme de PDF propre. Le PDF en ENTRÉE n'est pas géré.
version: 1.1.0
metadata:
  hermes:
    tags: [documents, conversion, pdf, bureautique, mania]
    category: mania
---

# Convertir un document (service MANIA)

## Overview
MANIA met à disposition un service de conversion de documents partagé, propulsé par
LibreOffice. Son adresse est dans l'environnement (`$MANIA_DOCUMENTS_URL`) : **utilise
toujours la variable, jamais une adresse écrite en clair** — selon le locataire, le service
se joint par un nom public ou par un nom interne, et une adresse recopiée en dur échoue
silencieusement sur la moitié des installations.

**L'entrée et la sortie n'acceptent pas les mêmes formats** — ne promets pas une conversion
avant de l'avoir tentée :
- **En entrée** : Word (`docx`/`doc`), Excel (`xlsx`/`xls`), PowerPoint (`pptx`/`ppt`),
  OpenDocument (`odt`/`ods`/`odp`), `html`, `csv`, `txt`, `rtf`.
  ⚠️ **Le `pdf` en ENTRÉE est refusé** (`422`, « format d'entrée non géré ») — observé en
  production le 2026-08-08. Un PDF ne se reconvertit donc pas : il faut repartir du document
  source. Si l'utilisateur n'a qu'un PDF, dis-le-lui plutôt que d'essayer.
- **En sortie** : `pdf`, et les formats bureautiques ci-dessus, plus images (`png`/`jpg`).

L'authentification utilise le jeton **déjà présent dans l'environnement**
(`$SHARED_SERVICES_TOKEN`) — ne jamais le demander à l'utilisateur ni l'afficher.

## When to Use
- L'utilisateur demande explicitement une conversion : « convertis ce Word en PDF »,
  « transforme ce fichier en xlsx », « donne-moi ça en PDF », etc.
  ⚠️ Sauf si la **source est un PDF** : ce sens-là n'est pas géré (voir Overview).
- Tu viens de produire un document (par ex. un rapport `.docx`) et il doit être remis en
  **PDF** propre.
- **Ne pas** utiliser pour modifier le *contenu* d'un document : c'est une conversion de
  **format** uniquement.

## Procedure
1. Repère le **fichier d'entrée** (le document fourni ou que tu viens de créer) et son chemin,
   puis le **format cible** (`to`) — une extension simple, par ex. `pdf`.
2. Convertis via le terminal (une seule commande) :
   ```sh
   curl -sS -w '\nHTTP %{http_code}\n' -X POST "${MANIA_DOCUMENTS_URL:-https://documents.mania.sn}/v1/convert" \
     -H "Authorization: Bearer $SHARED_SERVICES_TOKEN" \
     -F "file=@CHEMIN_ENTREE" \
     -F "to=FORMAT_CIBLE" \
     -o CHEMIN_SORTIE
   ```
   Remplace `CHEMIN_ENTREE`, `FORMAT_CIBLE` et `CHEMIN_SORTIE`, **et rien d'autre** : laisse
   `${MANIA_DOCUMENTS_URL:-…}` tel quel, le shell le résout. Le fichier converti est écrit
   dans `CHEMIN_SORTIE`.
3. Lis le **code HTTP** affiché à la fin :
   - `HTTP 200` → conversion réussie ; `CHEMIN_SORTIE` contient le document.
   - `400` → format cible non supporté · `401` → problème de jeton · `413` → fichier trop
     volumineux · `422` → fichier d'entrée invalide/non géré · `504` → délai dépassé.
     Dans ces cas, `CHEMIN_SORTIE` contient un message JSON : lis-le (`cat CHEMIN_SORTIE`) et
     explique clairement le problème à l'utilisateur.
4. Remets le fichier converti à l'utilisateur (en pièce jointe).

## Common Pitfalls
- **Ne demande jamais le jeton** : `$SHARED_SERVICES_TOKEN` est déjà dans l'environnement.
- **N'écris jamais l'adresse du service en dur.** Si `curl` répond « could not resolve host »
  ou n'aboutit pas, ce n'est pas une panne du service : c'est que l'adresse a été recopiée au
  lieu d'être laissée sous forme de variable. Vérifie avec `echo "$MANIA_DOCUMENTS_URL"`.
- **Format cible = extension simple** (`pdf`, `docx`, `xlsx`…), pas un nom de filtre LibreOffice.
- Si `CHEMIN_SORTIE` est très petit ou ressemble à du JSON, c'est une **erreur**, pas un
  document — lis le message plutôt que de le livrer tel quel.
- Le service **ne modifie pas** le contenu. Pour éditer un document, produis-le d'abord avec
  les outils adaptés, puis convertis-le.
- Une conversion peut prendre quelques secondes (chargement de LibreOffice) — c'est normal.

## Verification Checklist
- [ ] Le code affiché est bien `HTTP 200`.
- [ ] `CHEMIN_SORTIE` existe et sa taille est non nulle (`ls -l CHEMIN_SORTIE`).
- [ ] Le fichier a bien le type attendu. ⚠️ La commande `file` **n'existe pas** dans le
      conteneur : vérifie l'en-tête, par ex. pour un PDF
      `head -c 5 CHEMIN_SORTIE` doit afficher `%PDF-`.
