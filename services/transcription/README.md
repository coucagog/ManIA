# mania-transcription

Service partagé de transcription (`faster-whisper`, `small`, INT8) — cadrage complet dans
`STACK.md` §6 et `STACK-3.md` §36. Exposé à `https://transcription.mania.sn`, authentifié
par un token dérivé par tenant.

## Pourquoi une URL publique (et pas un service interne)

- **Deux déclencheurs : chat WebUI ET Telegram.** Telegram est géré par le conteneur
  **agent**, isolé sur le réseau du tenant, jamais sur `web` (`STACK.md` §13). Il ne peut
  joindre le service que par une URL publique, via son accès sortant (le même qui joint le
  LLM). Un `http://mania-transcription:8000` interne lui serait injoignable.
- **Externalisation à venir (Voxtral, VPS dédié).** En adressant `transcription.mania.sn`,
  la migration future = un simple **repointage DNS**, sans toucher un seul agent
  (`STACK.md` §9, « déménagement pas refonte »). Un nom Docker interne casserait tout.

Surface d'attaque maîtrisée : token **HMAC-SHA256 256 bits** par tenant + file d'attente
bornée. C'est le même modèle d'exposition que chaque sous-domaine tenant déjà en place.

## 🔴 À savoir AVANT de déployer

- **Rien ne consomme encore ce service.** Le déployer rend l'API joignable/testable, mais
  **aucun agent ne l'appellera** tant que l'outil correspondant côté Hermes n'existe pas
  (brique suivante). On construit le service d'abord — c'est voulu.
- **Deux agents tournent déjà** sur ce VPS pilote : `skd` (client réel) et `demo` (test,
  destiné à être retiré). Le plafond est de ~2-3 agents (`STACK.md` §13). 🔵 **Retirer `demo`
  avant de déployer libère ~1-2 Go** et remet de la marge ; sinon, la mesure RAM et le
  swapfile ci-dessous ne sont pas optionnels.
- **VPS sans swap.** `mem_limit` = **2 g** (un job à la fois). Le swapfile ~4 Go de §10
  n'est **toujours pas en place** : c'est l'amortisseur qui rend sûr l'ajout d'un service
  gourmand sur une machine à 0 swap. → **Fortement recommandé : le créer AVANT**, ou
  surveiller `free -h` de très près juste après.
- **Le build sollicite la prod** quelques minutes (pip + modèle ~500 Mo) → heure creuse.

## 1. Secret partagé (une seule fois, avant tout)

Sur le modèle exact de `.provisioning-secret` (§20) :

```bash
openssl rand -hex 32          # -> copier la valeur

sudo tee /opt/hermes/gabarit/.shared-services-secret >/dev/null <<< "<valeur>"
sudo chmod 600 /opt/hermes/gabarit/.shared-services-secret
sudo chown root:root /opt/hermes/gabarit/.shared-services-secret
# ⚠️ Ne JAMAIS monter ce fichier dans un conteneur client.
```

Le **même** secret ira dans le `.env` du service (étape 2).

## 2. Déploiement

```bash
mkdir -p /opt/hermes/transcription
# copier : Dockerfile, main.py, requirements.txt, docker-compose.yml,
#          .env.example, .dockerignore
cd /opt/hermes/transcription

cp .env.example .env
chmod 600 .env
# coller la MÊME valeur qu'à l'étape 1 dans SHARED_SERVICES_SECRET=

docker compose up -d --build
```

Pas de changement DNS : le wildcard `*.mania.sn` couvre déjà `transcription.mania.sn`.

## 3. Vérifications

```bash
# a) Santé interne
docker exec mania-transcription \
  python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read())"

# b) Route Traefik + certificat (public)
curl -I https://transcription.mania.sn/health          # attendu : HTTP/2 200

# c) 🔴 LE test qui compte : un conteneur AGENT (réseau isolé) atteint-il l'URL
#    publique ? (hairpin/NAT-loopback, le service étant encore sur ce même VPS)
#    Remplacer <agent> par le nom réel du conteneur agent d'un tenant.
docker exec <agent> \
  curl -s -o /dev/null -w "%{http_code}\n" https://transcription.mania.sn/health
#    Attendu : 200. Si échec (000/timeout) = NAT-loopback non traversé : solvable
#    (config iptables/DNS interne) — me le signaler, on le règle avant d'aller plus loin.

# d) RAM avant/après (le point critique de ce VPS sans swap)
docker stats --no-stream
free -h
```

Mettre à jour l'estimation de capacité de §10 avec la RAM réellement mesurée (elle datait
d'avant que 2 agents ne tournent).

## 4. Générer le token d'un tenant — patch pour `nouveau-tenant.sh`

Le token se dérive du slug + secret partagé (aucune table à tenir). À ajouter là où les
secrets du `.env` du tenant sont écrits (avant `docker compose up -d`) :

```bash
# --- Token des services partagés (transcription, futur "documents") --------
SHARED_SECRET_FILE="/opt/hermes/gabarit/.shared-services-secret"
if [[ -r "$SHARED_SECRET_FILE" ]]; then
  SHARED_SERVICES_SECRET="$(cat "$SHARED_SECRET_FILE")"
  HMAC_HEX="$(printf '%s' "$slug" \
    | openssl dgst -sha256 -hmac "$SHARED_SERVICES_SECRET" -hex | awk '{print $NF}')"
  echo "SHARED_SERVICES_TOKEN=${slug}.${HMAC_HEX}" >> "$ENV_FILE"
else
  echo "AVERTISSEMENT : $SHARED_SECRET_FILE illisible — SHARED_SERVICES_TOKEN non écrit"
fi
```

L'outil côté agent (à construire) lit `SHARED_SERVICES_TOKEN` depuis le `.env` du tenant
et l'envoie en `Authorization: Bearer <token>`.

## 5. Patch rétroactif — `skd` uniquement

`skd` a été provisionné avant ce service : pas encore de `SHARED_SERVICES_TOKEN`. Une fois
le secret créé (étape 1) :

```bash
SLUG=skd
SECRET="$(cat /opt/hermes/gabarit/.shared-services-secret)"
HMAC_HEX="$(printf '%s' "$SLUG" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')"
echo "SHARED_SERVICES_TOKEN=${SLUG}.${HMAC_HEX}" >> "/opt/hermes/${SLUG}/.env"
( cd "/opt/hermes/${SLUG}" && docker compose up -d )   # recharge le .env
```

ℹ️ L'autre agent, `demo`, est un agent de **test destiné à être retiré** (remplacé par un
agent plus abouti) : inutile de le patcher. Le futur agent recevra son token
**automatiquement** au provisioning, une fois `nouveau-tenant.sh` patché (§4).

## 6. Test d'un appel réel (public, une fois un token en main)

```bash
TOKEN="skd.<hmac_calculé>"
curl -X POST https://transcription.mania.sn/v1/transcribe \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/chemin/vers/un-audio.mp3"
```

Réponse attendue : `{"text":"...","language":"fr"}`.

## Rappels non négociables (STACK.md §6)

- **Éphémère** : rien sur disque, ni audio ni texte loggué — seulement
  tenant / durée / taille / succès-échec.
- **File d'attente bornée** : les agents soumettent en concurrence ; le service traite via
  la file (`WHISPER_WORKERS`, défaut 1), pas de parallélisme libre.
- **Token par tenant** : dérivé, jamais stocké côté service.
