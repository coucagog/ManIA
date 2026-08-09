---
name: convertir-document
description: Convertit un document d'un format à un autre (Word, Excel, PowerPoint, PDF, OpenDocument, HTML, CSV, images…) via le service MANIA. À utiliser dès que l'utilisateur demande une conversion de format (par ex. docx→pdf, pdf→docx, xlsx→pdf) ou pour livrer un document produit sous forme de PDF propre.
version: 1.0.0
metadata:
  hermes:
    tags: [documents, conversion, pdf, bureautique, mania]
    category: mania
---

# Convertir un document (service MANIA)

## Overview
MANIA met à disposition un service de conversion de documents partagé, propulsé par
LibreOffice, joignable à `https://documents.mania.sn`. Il convertit entre la plupart des
formats bureautiques : Word (`docx`/`doc`), Excel (`xlsx`/`xls`), PowerPoint (`pptx`/`ppt`),
OpenDocument (`odt`/`ods`/`odp`), `pdf`, `html`, `csv`, `txt`, `rtf`, images (`png`/`jpg`),
`epub`. L'authentification utilise le jeton **déjà présent dans l'environnement**
(`$SHARED_SERVICES_TOKEN`) — ne jamais le demander à l'utilisateur ni l'afficher.

## When to Use
- L'utilisateur demande explicitement une conversion : « convertis ce Word en PDF »,
  « transforme ce fichier en xlsx », « donne-moi ça en PDF », etc.
- Tu viens de produire un document (par ex. un rapport `.docx`) et il doit être remis en
  **PDF** propre.
- **Ne pas** utiliser pour modifier le *contenu* d'un document : c'est une conversion de
  **format** uniquement.

## Procedure
1. Repère le **fichier d'entrée** (le document fourni ou que tu viens de créer) et son chemin,
   puis le **format cible** (`to`) — une extension simple, par ex. `pdf`.
2. Convertis via le terminal (une seule commande) :
   ```sh
   curl -sS -w '\nHTTP %{http_code}\n' -X POST https://documents.mania.sn/v1/convert \
     -H "Authorization: Bearer $SHARED_SERVICES_TOKEN" \
     -F "file=@CHEMIN_ENTREE" \
     -F "to=FORMAT_CIBLE" \
     -o CHEMIN_SORTIE
   ```
   Remplace `CHEMIN_ENTREE`, `FORMAT_CIBLE` et `CHEMIN_SORTIE`. Le fichier converti est écrit
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
- **Format cible = extension simple** (`pdf`, `docx`, `xlsx`…), pas un nom de filtre LibreOffice.
- Si `CHEMIN_SORTIE` est très petit ou ressemble à du JSON, c'est une **erreur**, pas un
  document — lis le message plutôt que de le livrer tel quel.
- Le service **ne modifie pas** le contenu. Pour éditer un document, produis-le d'abord avec
  les outils adaptés, puis convertis-le.
- Une conversion peut prendre quelques secondes (chargement de LibreOffice) — c'est normal.

## Verification Checklist
- [ ] Le code affiché est bien `HTTP 200`.
- [ ] `CHEMIN_SORTIE` existe et sa taille est non nulle (`ls -l CHEMIN_SORTIE`).
- [ ] `file CHEMIN_SORTIE` indique le type attendu (par ex. « PDF document » pour `to=pdf`).
