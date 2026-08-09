# mania-documents

Service partagé de **conversion de documents** (LibreOffice headless) — cadrage `STACK.md`
§7, `STACK-3.md` §36/§42. Exposé à `https://documents.mania.sn`, authentifié par le **même**
token dérivé par tenant que la transcription.

## Ce qu'il fait

`POST /v1/convert` : un fichier + un champ `to` (format cible) → le fichier converti (binaire).
Général via LibreOffice : docx↔pdf, mais aussi xlsx→pdf, pptx→pdf, odt, html, csv, images, etc.
(liste dans `/health`).

Conception (STACK §7) :
- **Conteneur séparé** de la transcription (une panne `soffice` ne l'emporte pas).
- **File sérialisée** (une conversion à la fois) + **profil LibreOffice isolé par requête** →
  élimine le piège des profils concurrents.
- **Éphémère** : dossier temporaire par requête, supprimé ensuite ; rien stocké ni loggué.

## 🔑 Le token est PARTAGÉ avec la transcription

Le token d'un tenant = `HMAC(SHARED_SERVICES_SECRET, slug)` — **le même secret** que la
transcription (`/opt/hermes/gabarit/.shared-services-secret`). Conséquence : le
`SHARED_SERVICES_TOKEN` **déjà présent dans chaque agent fonctionne aussi pour la conversion**,
sans aucun nouveau câblage côté tenant. Il ne reste, pour qu'un agent s'en serve, qu'une
**skill** qui lui apprend à appeler `documents.mania.sn` (phase 2).

## 1. Déploiement

```bash
mkdir -p /opt/hermes/documents
# copier : Dockerfile, main.py, requirements.txt, docker-compose.yml,
#          .env.example, .dockerignore
cd /opt/hermes/documents

cp .env.example .env
chmod 600 .env
# ⚠️ Coller dans SHARED_SERVICES_SECRET la MÊME valeur que
#    /opt/hermes/gabarit/.shared-services-secret :
#    sudo cat /opt/hermes/gabarit/.shared-services-secret
docker compose up -d --build
```

Le build est **long** (LibreOffice ~quelques centaines de Mo) et sollicite CPU/disque quelques
minutes → heure creuse. Pas de changement DNS (`*.mania.sn` couvre `documents.mania.sn`).

## 2. Vérifications

```bash
# Santé interne
docker exec mania-documents \
  python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"

# Route + certificat public
curl -I https://documents.mania.sn/health          # attendu : HTTP/2 200

# RAM après build (LibreOffice pèse)
docker stats --no-stream ; free -h
```

## 3. Test de conversion réel (une fois un token en main)

Le `SHARED_SERVICES_TOKEN` de n'importe quel tenant convient (p. ex. celui de `skd`).

```bash
TOKEN="skd.<hmac>"
# créer un docx de test rapidement puis le convertir en PDF :
printf 'Bonjour Dakar' > /tmp/t.txt
curl -sS -X POST https://documents.mania.sn/v1/convert \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/tmp/t.txt" -F "to=pdf" \
  -o /tmp/out.pdf
file /tmp/out.pdf        # attendu : PDF document
```

Réponse attendue : un fichier PDF téléchargé (`Content-Type: application/pdf`). Erreurs :
`400` format cible non supporté · `401` token · `413` trop volumineux · `422` fichier d'entrée
non géré · `504` conversion trop longue.

## 4. Usage par un agent (skill — phase 2)

Rien à câbler côté tenant (le token existe déjà). Une **skill** apprendra à l'agent, via son
outil `terminal`/`code_execution`, à appeler le service, p. ex. :

```sh
curl -sS -X POST https://documents.mania.sn/v1/convert \
  -H "Authorization: Bearer $SHARED_SERVICES_TOKEN" \
  -F "file=@<fichier>" -F "to=pdf" -o <sortie>
```

## Phase 2 — remplissage de gabarits (à venir, même conteneur)

L'image embarque déjà `python-docx`/`docxtpl`/`openpyxl`/`python-pptx`. Un futur endpoint
`POST /v1/fill` prendra un **gabarit** (docx/xlsx/pptx à champs) + des **données** → document
rempli, puis conversion optionnelle. C'est la brique qui rejoint la logique de la skill
`facture-sunu-vision` (générer un document précis à partir d'un modèle).

## Rappels non négociables (STACK.md §7)

- **Conteneur séparé** de la transcription.
- **File sérialisée** : une conversion à la fois (pas de LibreOffice concurrents).
- **Éphémère** : rien sur disque au-delà de la requête, aucun contenu loggué.
- **Token par tenant** : dérivé, partagé avec la transcription.
