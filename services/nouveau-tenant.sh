#!/usr/bin/env bash
# =============================================================================
#  nouveau-tenant.sh  (v3)  — PROTOTYPE du service de provisioning
# =============================================================================
#  Crée, démarre et VÉRIFIE un locataire complet depuis le gabarit validé.
#
#  NOUVEAUTÉ v2 — la leçon du 2026-07-19 :
#  Le provider Docker de Traefik peut CESSER DE DÉCOUVRIR les nouveaux conteneurs,
#  SILENCIEUSEMENT. Un client créé pendant cette panne serait injoignable (404)
#  sans qu'aucune alerte ne se déclenche nulle part.
#  => Le script VÉRIFIE la route, et propose un redémarrage de Traefik si besoin.
#
#  NOUVEAUTÉ v3 — le pack, et la pseudonymisation (STACK-4 §55, pt 9 et pt 10) :
#  Un pack peut déclarer `PII=1`. Le locataire naît alors PSEUDONYMISÉ :
#    - son réseau est `internal: true` (aucune route vers l'extérieur),
#    - le proxy PII et les services partagés sont raccordés à ce réseau,
#    - son agent est câblé sur le profil de fournisseur `custom:mania-pii`,
#    - son `SOUL` porte la section `# Pseudonymisation`.
#  Les quatre vont ENSEMBLE : sans l'egress, le câblage se contourne en
#  choisissant un modèle (fuite reproduite en production, §55) ; sans le
#  câblage, l'agent est muet ; sans la section `SOUL`, il refuse de rédiger.
#  => Aucun de ces quatre gestes n'est un réglage optionnel.
#
#  Usage :
#    sudo ./nouveau-tenant.sh <slug> ["Nom client"] ["Domaine"] ["NomAgent"]
#    sudo ./nouveau-tenant.sh <slug> --owner=mls@gcouca.com --pack=sante
#    sudo ./nouveau-tenant.sh <slug> ... --pii      # force la pseudonymisation
#    sudo ./nouveau-tenant.sh <slug> ... --auto     # sans confirmation (auto)
#    sudo ./nouveau-tenant.sh <slug> ... --creer-seulement   # ne démarre pas
# =============================================================================
set -euo pipefail

DOMAINE_BASE="mania.sn"
GABARIT="${GABARIT:-/opt/hermes/gabarit}"   # surchargeable pour les essais
AUTO=0
CREER_SEULEMENT=0
OWNER_EMAIL=""
PACK="generique"
FORCE_PII=0
SECRET_PROV="/opt/hermes/gabarit/.provisioning-secret"
SECRET_SHARED="/opt/hermes/gabarit/.shared-services-secret"

# Profil de fournisseur (§55). Le modèle par défaut doit être servi par la clé
# que le client saisira lui-même dans sa WebUI (§4quater) : on ne choisit ici
# que la route, jamais le compte.
PROXY_PII="mania-pii"
PORT_PII="8000"
MODELE_DEFAUT="deepseek/deepseek-v4-flash"

ARGS=()
for a in "$@"; do
  case "$a" in
    --auto) AUTO=1 ;;
    --creer-seulement) CREER_SEULEMENT=1 ;;
    --owner=*) OWNER_EMAIL="${a#--owner=}" ;;
    --pack=*)  PACK="${a#--pack=}" ;;
    # --pii ELEVE le niveau, il ne l'abaisse jamais. Il n'existe volontairement
    # AUCUN --no-pii : desactiver la pseudonymisation d'un secteur qui la
    # declare serait un geste de conformite, pas une option de ligne de
    # commande -- et le 55 a montre ce que coute un geste banal qui desarme
    # le dispositif en silence.
    --pii)     FORCE_PII=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]:-}"

SLUG="${1:-}"
NOM_CLIENT="${2:-${SLUG:-}}"
DOMAINE="${3:-assistance generale}"
NOM_AGENT="${4:-Ridwan}"

err()  { echo "ERREUR: $*" >&2; exit 1; }
info() { echo "-- $*"; }

[ -n "$SLUG" ] || err "usage: $0 <slug> [\"Nom client\"] [\"Domaine\"] [\"NomAgent\"]"

# Le slug sert de sous-domaine, de nom de conteneur, de reseau ET de routeur
# Traefik. Un caractere invalide casserait l'un des quatre.
echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || err "slug invalide (minuscules, chiffres, tirets ; pas de tiret en bord)"

# Collision de nom de routeur Traefik = site de production casse.
# ⚠️ DOIT rester identique a RESERVED dans services/main.py (le demon). Les deux
# listes avaient diverge : le demon acceptait 'transcription', 'documents' et
# 'pii', que ce script refusait ensuite -- refus tardif, apres creation du job.
for reserve in mania traefik www api admin app mail transcription documents pii; do
  [ "$SLUG" = "$reserve" ] && err "'$SLUG' est reserve (collision Traefik/DNS)"
done

BASE="/opt/hermes/$SLUG"
[ -e "$BASE" ] && err "$BASE existe deja (locataire deja provisionne ?)"

command -v htpasswd >/dev/null || err "htpasswd absent (apt install apache2-utils)"
command -v docker   >/dev/null || err "docker absent"
[ -f "$GABARIT/SOUL.gabarit.md" ]   || err "gabarit manquant: $GABARIT/SOUL.gabarit.md"
[ -f "$GABARIT/AGENTS.gabarit.md" ] || err "gabarit manquant: $GABARIT/AGENTS.gabarit.md"
docker network inspect web >/dev/null 2>&1 || err "reseau docker 'web' introuvable"

# --- 0. Le pack decide de la pseudonymisation --------------------------------
# LE PACK EST LE SECTEUR D'ACTIVITE. Le panneau d'admin passe `pack={d.secteur}`
# (src/app/admin/demandes/page.tsx), donc les valeurs possibles sont les douze
# slugs de src/lib/secteurs.ts -- 'sante', 'droit', 'commerce'... Il faut un
# packs/<secteur>.conf pour chacun, sinon le provisionnement web est refuse.
#
# ⚠️ Le secteur est declare par le PROSPECT dans le formulaire de candidature.
# C'est un defaut, pas un verdict : --pii permet d'elever au cas par cas (un
# cabinet de conseil qui traite des dossiers RH coche « Services »).
#
# La declaration est DANS le pack, pas dans ce script : y tenir la liste des
# secteurs sensibles serait une liste de plus, et le STACK-4 54 a etabli que
# dans ce service les defauts viennent des listes. Le doublon avec secteurs.ts
# est ASSUME : ajouter un secteur sans declarer son .conf fait echouer le
# provisionnement avec un message clair, et c'est exactement le moment ou la
# question « sensible ou non ? » doit etre posee.
#
# Format de $GABARIT/packs/<pack>.conf -- une seule cle lue, aucun `source` :
#     PII=1     # ou PII=0
#
# Trois regles, toutes deny-by-default :
#   - pack != generique SANS fichier          -> ERREUR (une faute de frappe
#     dans --pack ne doit jamais accoucher d'un locataire ouvert).
#   - fichier present SANS ligne PII=0|1      -> ERREUR (on ne devine pas).
#   - pack generique sans fichier             -> PII=0, comportement historique.
PII=0
PACK_CONF="$GABARIT/packs/$PACK.conf"
if [ -f "$PACK_CONF" ]; then
  grep -Eq '^[[:space:]]*PII[[:space:]]*=[[:space:]]*[01][[:space:]]*$' "$PACK_CONF" \
    || err "$PACK_CONF ne declare ni PII=0 ni PII=1 -- refus de deviner"
  if grep -Eq '^[[:space:]]*PII[[:space:]]*=[[:space:]]*1[[:space:]]*$' "$PACK_CONF"; then
    PII=1
  fi
elif [ "$PACK" != "generique" ]; then
  echo "ERREUR: pack '$PACK' inconnu -- $PACK_CONF introuvable." >&2
  echo "  Packs declares :" >&2
  ls -1 "$GABARIT/packs" 2>/dev/null | sed 's/\.conf$/  /;s/^/    /' >&2 \
    || echo "    (aucun -- le dossier $GABARIT/packs n'existe pas)" >&2
  err "abandon"
else
  info "pack 'generique' sans declaration -- PII desactive (comportement historique)"
fi

# --pii n'a qu'un sens : monter. Un secteur qui declare PII=1 le reste, que le
# drapeau soit passe ou non.
if [ "$FORCE_PII" = "1" ] && [ "$PII" = "0" ]; then
  PII=1
  info "--pii : le secteur '$PACK' ne l'exigeait pas, pseudonymisation FORCEE"
fi

if [ "$PII" = "1" ]; then
  # Verifie AVANT de creer quoi que ce soit : un reseau ferme sans proxy joignable
  # donne un agent definitivement muet. Fail-closed, mais inutilisable.
  docker inspect "$PROXY_PII" >/dev/null 2>&1 \
    || err "pack '$PACK' exige la pseudonymisation, mais '$PROXY_PII' ne tourne pas"
  [ -f "$SECRET_SHARED" ] \
    || err "pack '$PACK' exige la pseudonymisation, mais $SECRET_SHARED est absent (pas de token, pas de route vers le proxy)"
  info "pack '$PACK' : PSEUDONYMISATION ACTIVE (reseau ferme + proxy PII)"
else
  info "pack '$PACK' : pseudonymisation inactive"
fi

# Reseau ferme ou non : le compose le DECLARE, il ne le sous-entend pas.
# Idem pour l'URL de transcription -- publique tant que le locataire est ouvert,
# interne des qu'il est ferme (le nom d'hote public n'est plus resolvable).
if [ "$PII" = "1" ]; then
  RESEAU_INTERNE="true"
  URL_STT="http://mania-transcription:8000/v1/transcribe"
  URL_DOCS="http://mania-documents:8000"
else
  RESEAU_INTERNE="false"
  URL_STT="https://transcription.$DOMAINE_BASE/v1/transcribe"
  URL_DOCS="https://documents.$DOMAINE_BASE"
fi

URL="https://$SLUG.$DOMAINE_BASE"
echo "== Provisionnement de '$SLUG'  ->  $URL"

# --- 1. Arborescence et secrets ---------------------------------------------
mkdir -p "$BASE/data/workspace"

WEBUI_PW="$(openssl rand -base64 18)"
BASIC_PW="$(openssl rand -base64 12)"
API_KEY="$(openssl rand -hex 32)"
HTPASS="$(htpasswd -nbB "$SLUG" "$BASIC_PW" | sed -e 's/\$/\$\$/g')"

# Token des services partages (transcription, futur "documents"), derive du
# slug + secret maitre commun : aucun etat a synchroniser cote service.
# Absent = non fatal (comme le secret de provisioning) : locataire cree sans
# transcription, a patcher ensuite. Doit matcher le calcul Python du service.
SHARED_TOKEN=""
if [ -f "$SECRET_SHARED" ]; then
  SHARED_TOKEN="$SLUG.$(printf '%s' "$SLUG" | openssl dgst -sha256 -hmac "$(cat "$SECRET_SHARED")" -hex | awk '{print $NF}')"
else
  echo "!! ATTENTION : $SECRET_SHARED absent — SHARED_SERVICES_TOKEN non genere." >&2
  echo "   Le locataire n'aura pas la transcription tant qu'il n'est pas patche." >&2
fi

cat > "$BASE/.env" <<EOF
HERMES_WEBUI_PASSWORD=$WEBUI_PW
TRAEFIK_BASICAUTH=$HTPASS
API_SERVER_KEY=$API_KEY
SHARED_SERVICES_TOKEN=$SHARED_TOKEN
WANTED_UID=1000
WANTED_GID=1000
EOF
chmod 600 "$BASE/.env"
info "secrets generes (.env en 0600)"

# --- 2. Compose --------------------------------------------------------------
cat > "$BASE/docker-compose.yml" <<EOF
# Locataire: $SLUG  —  genere par nouveau-tenant.sh v2
# MAJ DE L'AGENT : docker compose down && docker volume rm ${SLUG}_hermes-agent-src
#                  && docker compose pull && docker compose up -d
#                  (sans le volume rm, la MAJ est SANS EFFET)
services:
  $SLUG-agent:
    image: nousresearch/hermes-agent:latest
    container_name: $SLUG-agent
    command: gateway run
    restart: unless-stopped
    networks: [$SLUG-net]
    environment:
      - HERMES_HOME=/home/hermes/.hermes
      - HERMES_UID=\${WANTED_UID:-1000}
      - HERMES_GID=\${WANTED_GID:-1000}
      - API_SERVER_ENABLED=true
      - API_SERVER_HOST=0.0.0.0
      - API_SERVER_KEY=\${API_SERVER_KEY:?definir dans .env}
      - SHARED_SERVICES_TOKEN=\${SHARED_SERVICES_TOKEN:-}
      - MANIA_STT_URL=$URL_STT
      # Lue par les skills mania/convertir-document et mania/remplir-gabarit.
      # Sans elle, un locataire ferme copie le nom d'hote public ecrit dans le
      # SKILL.md et n'atteint jamais le service -- l'agent le DIT (il l'a dit
      # en production le 2026-08-08), mais il ne convertit rien.
      - MANIA_DOCUMENTS_URL=$URL_DOCS
    volumes:
      - hermes-home:/home/hermes/.hermes
      - hermes-agent-src:/opt/hermes
      - ./data/workspace:/workspace
    mem_limit: 512m
    cpus: 1.0

  $SLUG-webui:
    image: mania-webui:latest
    container_name: $SLUG-webui
    restart: unless-stopped
    depends_on: [$SLUG-agent]
    networks: [$SLUG-net, web]
    environment:
      - HERMES_WEBUI_HOST=0.0.0.0
      - HERMES_WEBUI_PORT=8787
      - HERMES_WEBUI_STATE_DIR=/home/hermeswebui/.hermes/webui
      - HERMES_API_URL=http://$SLUG-agent:8642
      - HERMES_WEBUI_PASSWORD=\${HERMES_WEBUI_PASSWORD:?definir dans .env}
      - WANTED_UID=\${WANTED_UID:-1000}
      - WANTED_GID=\${WANTED_GID:-1000}
    volumes:
      - hermes-home:/home/hermeswebui/.hermes
      - hermes-agent-src:/home/hermeswebui/.hermes/hermes-agent:ro
      - ./data/workspace:/workspace
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.$SLUG.rule=Host(\`$SLUG.$DOMAINE_BASE\`)"
      - "traefik.http.routers.$SLUG.entrypoints=websecure"
      - "traefik.http.routers.$SLUG.tls=true"
      - "traefik.http.routers.$SLUG.tls.certresolver=letsencrypt"
      - "traefik.http.services.$SLUG.loadbalancer.server.port=8787"
      - "traefik.http.routers.$SLUG.middlewares=$SLUG-auth"
      - "traefik.http.middlewares.$SLUG-auth.forwardauth.address=http://mania-app-1:3000/api/tenant-auth"
      - "traefik.http.middlewares.$SLUG-auth.forwardauth.trustForwardHeader=true"
      - "traefik.http.middlewares.$SLUG-auth.forwardauth.maxResponseBodySize=8192"
    mem_limit: 1g
    cpus: 0.75

networks:
  $SLUG-net:
    driver: bridge
    # internal: true = BARRIERE EGRESS (STACK-4 pt 9). L'agent n'a alors ni DNS
    # externe ni couche IP vers l'exterieur : son seul interlocuteur est le proxy
    # PII, raccorde a ce reseau par 'docker network connect' (voir
    # services/reconnecter-services.sh, A REJOUER APRES TOUT REBUILD DU PROXY).
    # Ne jamais passer a false sans deposer le cablage du profil en meme temps.
    internal: $RESEAU_INTERNE
  web:
    external: true

volumes:
  hermes-home:
  hermes-agent-src:
EOF
info "compose genere"

# --- 3. Fichiers de contexte -------------------------------------------------
# AGENTS.md : bind mount, existe des maintenant, vu par les DEUX conteneurs.
sed "s|{{NOM_CLIENT}}|$NOM_CLIENT|g" "$GABARIT/AGENTS.gabarit.md" \
  > "$BASE/data/workspace/AGENTS.md"

# SOUL.md : vit dans le volume nomme hermes-home, qui n'existe qu'APRES le up.
sed -e "s|{{NOM_AGENT}}|$NOM_AGENT|g" \
    -e "s|{{NOM_CLIENT}}|$NOM_CLIENT|g" \
    -e "s|{{DOMAINE}}|$DOMAINE|g" \
    -e "s|{{LANGUE}}|francais|g" "$GABARIT/SOUL.gabarit.md" \
  > "$BASE/SOUL.rendu.md"

# --- Section `# Pseudonymisation` (STACK-4 55, pt 13) ------------------------
# Elle est ICI et pas dans le gabarit, volontairement : c'est un COMPOSANT du
# pack, pas un contenu editorial par client. Sans elle le pack sensible ne
# fonctionne pas -- la garde anti-hallucination du SOUL MANIA (« tu n'inventes
# jamais ... si tu ne sais pas, tu le dis ») fait REFUSER l'agent devant un
# marqueur. Les modeles n'echouaient pas : ils obeissaient. La lever depuis le
# gabarit exposerait a l'oublier sur un tenant ; l'oubli ne serait vu qu'au
# premier refus, devant le client.
# Le SOUL est exclu de la pseudonymisation depuis le 53 : cette consigne
# arrive donc INTACTE au modele, marqueurs d'exemple compris.
if [ "$PII" = "1" ]; then
cat >> "$BASE/SOUL.rendu.md" <<'SOULPII'

# Pseudonymisation

Certains messages que tu reçois contiennent des marqueurs de la forme `[NOM_1]`,
`[TELEPHONE_2]`, `[DATE_3]`, `[ADRESSE_1]`, `[EMAIL_1]`…

Ces marqueurs remplacent de **vraies données**, protégées pendant le transport. Elles
sont rétablies automatiquement dans ta réponse, avant que ton interlocuteur ne la lise.
Tu travailles donc sur des informations réelles et complètes : il ne te manque rien.

Règles :

- Traite chaque marqueur comme la valeur qu'il représente. `[NOM_1]` **est** un nom,
  `[DATE_3]` **est** une date. Rédige avec, exactement comme avec la valeur réelle.
- Recopie-les **à l'identique**, caractère pour caractère, y compris le numéro. Ne les
  traduis pas, ne les reformule pas, n'en invente pas de nouveaux.
- Dans un même message, un marqueur donné désigne toujours la même personne ou la même
  valeur.
- Ne réclame **jamais** les valeurs réelles : tu ne les recevras pas, et tu n'en as pas
  besoin pour faire ton travail.

Règle de silence — elle l'emporte en cas de doute :

Tu ne parles **jamais** des marqueurs ni de ce mécanisme. Aucun avertissement, aucune
précaution, aucune note en fin de réponse, aucune phrase du type « les marqueurs seront
remplacés par les vraies données » ou « je n'ai pas les valeurs réelles ». Ta réponse
doit être **mot pour mot** celle que tu aurais écrite en lisant les valeurs réelles à la
place des marqueurs — rien de plus.

Cette section est une **exception explicite** à ta règle « tu n'inventes jamais ». Elle
ne l'affaiblit pas : utiliser un marqueur n'est pas inventer une donnée, c'est employer
une donnée que tu as bien reçue, sous la forme sous laquelle elle t'est transmise.
SOULPII
info "section '# Pseudonymisation' ajoutee au SOUL"
fi

chown -R 1000:1000 "$BASE/data"
info "SOUL.md et AGENTS.md prepares"

if [ "$CREER_SEULEMENT" = "1" ]; then
  echo
  echo "== Fichiers crees dans $BASE (non demarre, --creer-seulement)"
  echo "   cd $BASE && docker compose up -d"
  exit 0
fi

# --- 4. Demarrage ------------------------------------------------------------
# --- Enregistrement du locataire dans mania-app -----------------------------
# ORDRE IMPERATIF : la ligne Tenant doit exister AVANT que les labels
# forwardAuth ne prennent effet, sinon le locataire est INACCESSIBLE — y
# compris a son proprietaire.
if [ -n "$OWNER_EMAIL" ] && [ -f "$SECRET_PROV" ]; then
  info "enregistrement du locataire dans mania-app"
  # L'IP de mania-app change a chaque recreation du conteneur : on la resout
  # a chaque execution plutot que de la coder en dur.
  MANIA_IP="$(docker inspect mania-app-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)"
  if [ -z "$MANIA_IP" ]; then
    err "mania-app-1 introuvable : impossible d'enregistrer le locataire"
  fi
  CODE="$(curl -s -o /tmp/prov.$$ -w '%{http_code}' -X POST --max-time 15 \
    -H 'Content-Type: application/json' \
    -H "x-provisioning-secret: $(cat "$SECRET_PROV")" \
    -d "{\"slug\":\"$SLUG\",\"name\":\"$NOM_CLIENT\",\"ownerEmail\":\"$OWNER_EMAIL\",\"pack\":\"$PACK\"}" \
    "http://$MANIA_IP:3000/api/tenants" 2>/dev/null || echo 000)"
  case "$CODE" in
    201) info "locataire enregistre en base" ;;
    200) info "locataire deja present en base (idempotent)" ;;
    *)   echo "ERREUR: enregistrement refuse (HTTP $CODE)" >&2
         cat /tmp/prov.$$ >&2 2>/dev/null; echo >&2
         rm -f /tmp/prov.$$
         err "abandon : sans ligne Tenant, le locataire serait inaccessible" ;;
  esac
  rm -f /tmp/prov.$$
else
  echo "!! ATTENTION : pas de --owner=<email> ou secret de provisioning absent." >&2
  echo "   Le locataire sera INACCESSIBLE tant que Tenant + TenantMember" >&2
  echo "   n'auront pas ete crees a la main." >&2
fi

info "demarrage des conteneurs"
( cd "$BASE" && docker compose up -d )

# --- Raccordement des services partages au reseau ferme ----------------------
# Le nom du projet compose est le nom du dossier ($SLUG), d'ou <slug>_<slug>-net
# (meme convention que desprovisionner-tenant.sh).
# Sur un reseau internal, AUCUN nom d'hote public n'est resolvable : les services
# partages doivent etre joints par leur nom de conteneur, donc etre membres du
# reseau. Le raccordement est porte par le CONTENEUR du service, pas par son
# compose -> il est perdu a chaque rebuild du service, d'ou
# services/reconnecter-services.sh.
RESEAU_TENANT="${SLUG}_${SLUG}-net"
if [ "$PII" = "1" ]; then
  for svc in "$PROXY_PII" mania-transcription mania-documents; do
    if ! docker inspect "$svc" >/dev/null 2>&1; then
      echo "ATTENTION: '$svc' ne tourne pas -- non raccorde a $RESEAU_TENANT." >&2
      continue
    fi
    if docker network connect "$RESEAU_TENANT" "$svc" 2>/dev/null; then
      info "$svc raccorde a $RESEAU_TENANT"
    else
      info "$svc : deja raccorde (ou raccordement refuse)"
    fi
  done
fi

# La WebUI installe les dependances Python de l'agent au premier demarrage :
# tant qu'elle n'est pas 'healthy', un curl renverrait 502 et non 404.
# Confondre les deux ferait redemarrer Traefik pour rien.
info "attente de l'etat healthy (jusqu'a 180 s)"
for i in $(seq 1 60); do
  etat="$(docker inspect "$SLUG-webui" --format '{{.State.Health.Status}}' 2>/dev/null || echo inconnu)"
  [ "$etat" = "healthy" ] && break
  sleep 3
done
[ "$etat" = "healthy" ] || echo "ATTENTION: webui pas 'healthy' (etat=$etat) — on continue" >&2

# --- 5. Injection de SOUL.md -------------------------------------------------
docker exec -i "$SLUG-agent" sh -c 'cat > /home/hermes/.hermes/SOUL.md' < "$BASE/SOUL.rendu.md"
info "SOUL.md injecte dans le volume"

# --- Skills MANIA : tout le dossier gabarit/skills -> hermes-home (survit MAJ) -
# Source unique dans le gabarit ; toute skill deposee la est provisionnee ici,
# sans nouveau patch. Le '/.' copie le CONTENU de skills/ dans skills/ du tenant.
SKILLS_SRC="$GABARIT/skills"
if [ -d "$SKILLS_SRC" ] && [ -n "$(ls -A "$SKILLS_SRC" 2>/dev/null)" ]; then
  info "installation des skills MANIA (depuis le gabarit)"
  docker exec "$SLUG-agent" mkdir -p /home/hermes/.hermes/skills
  docker cp "$SKILLS_SRC/." "$SLUG-agent:/home/hermes/.hermes/skills/"
else
  echo "ATTENTION: aucune skill dans le gabarit ($SKILLS_SRC) — rien installe." >&2
fi

# --- Transcription : wrapper + provider STT "mania" dans config.yaml ---------
# Wrapper dans hermes-home (survit aux MAJ Hermes). Chemin ABSOLU cote agent
# (docker exec/Hermes tournent en root/HOME absent -> '~' donnerait /root).
info "installation du provider de transcription (mania)"
docker exec -i "$SLUG-agent" sh -c 'mkdir -p /home/hermes/.hermes/bin && cat > /home/hermes/.hermes/bin/mania-transcribe.sh && chmod +x /home/hermes/.hermes/bin/mania-transcribe.sh' <<'WRAP'
#!/bin/sh
# L'URL vient de l'environnement du conteneur (MANIA_STT_URL, pose par le
# compose). Sur un locataire ferme (internal), le nom d'hote public n'est pas
# resolvable : il faut le nom de conteneur du service. Le repli garde le
# comportement des locataires provisionnes avant cette version.
url="${MANIA_STT_URL:-https://transcription.mania.sn/v1/transcribe}"
resp="$(curl -sS --max-time 290 -w '\n%{http_code}' -X POST \
  "$url" \
  -H "Authorization: Bearer $SHARED_SERVICES_TOKEN" \
  -F "file=@$1")" || { echo "mania-stt: echec curl" >&2; exit 1; }
code="$(printf '%s' "$resp" | tail -n1)"
body="$(printf '%s' "$resp" | sed '$d')"
if [ "$code" != "200" ]; then echo "mania-stt: HTTP $code -- $body" >&2; exit 1; fi
printf '%s' "$body" | python3 -c 'import sys,json; sys.stdout.write(json.load(sys.stdin).get("text",""))'
WRAP

# Attendre que Hermes ait cree config.yaml (jusqu'a ~30 s), puis cabler.
_cfg_ok=0
for _i in $(seq 1 15); do
  docker exec "$SLUG-agent" test -f /home/hermes/.hermes/config.yaml 2>/dev/null && { _cfg_ok=1; break; }
  sleep 2
done
if [ "$_cfg_ok" = "1" ]; then
  if docker exec -i "$SLUG-agent" python3 - <<'PYCFG'
p = "/home/hermes/.hermes/config.yaml"
s = open(p, encoding="utf-8").read()
if "provider: mania" in s:
    print("  provider deja present"); raise SystemExit(0)
anchor = "stt:\n  enabled: true\n"
block = ("stt:\n  enabled: true\n  provider: mania\n  providers:\n    mania:\n"
         "      type: command\n"
         '      command: "sh /home/hermes/.hermes/bin/mania-transcribe.sh {input_path}"\n'
         "      format: txt\n      language: fr\n      timeout: 300\n")
if s.count(anchor) == 1:
    open(p, "w", encoding="utf-8").write(s.replace(anchor, block, 1))
    print("  provider mania cable dans config.yaml")
else:
    print("  ANCRE stt inattendue -- provider NON cable (a faire a la main)"); raise SystemExit(3)
PYCFG
  then
    info "transcription cablee"
    BESOIN_RESTART=1
  else
    echo "ATTENTION: provider de transcription non cable (config.yaml inattendu)." >&2
    echo "   Wrapper installe ; cabler stt.provider=mania a la main." >&2
  fi
else
  echo "ATTENTION: config.yaml pas encore cree -- transcription non cablee." >&2
  echo "   Wrapper installe ; relancer le cablage ulterieurement." >&2
fi

# --- Profil de fournisseur `custom:mania-pii` (STACK-4 55) -------------------
# Forme canonique : une entree nommee sous `providers:`, selectionnee par
# `model.provider`. Elle porte l'URL ET la reference de cle dans le MEME objet
# -- c'est ce qui a tue le 401. `key_env` ne stocke que le NOM de la variable :
# le config.yaml ne contient aucun secret, et la cle reste celle que le client
# a saisie lui-meme dans sa WebUI (4quater).
if [ "$PII" = "1" ] && [ "$_cfg_ok" = "1" ]; then
  if [ -z "$SHARED_TOKEN" ]; then
    echo "ATTENTION: SHARED_SERVICES_TOKEN absent -- profil PII NON cable." >&2
    echo "   Le reseau est ferme et l'agent n'a aucune route : il echouera a" >&2
    echo "   chaque appel. Generer $SECRET_SHARED puis rejouer le cablage." >&2
  elif ! docker exec "$SLUG-agent" sh -lc 'command -v hermes' >/dev/null 2>&1; then
    echo "ATTENTION: binaire 'hermes' introuvable dans $SLUG-agent -- profil NON cable." >&2
  else
    info "cablage du profil de fournisseur 'mania-pii'"

    # Le nom du profil traverse _normalize_custom_provider_name
    # (strip().lower().replace(" ","-")) : 'mania-pii' passe inchange. Un nom a
    # espace ou a majuscule produirait un ECHEC SILENCIEUX avec repli sur le
    # provider par defaut -- c'est-a-dire une fuite. Ne jamais le nommer
    # 'custom' tout court (branche speciale du code, bug connu).
    URL_PII="http://$PROXY_PII:$PORT_PII/g/$SLUG/$SHARED_TOKEN/v1"

    # INCIDENT 55 : `hermes config set` JOURNALISE la valeur qu'il ecrit, et
    # cette valeur contient le token du locataire. Caviarder la verification ne
    # suffit pas -- il faut filtrer le retour de la commande elle-meme, sinon on
    # automatise une fuite. Le filtre porte sur la FORME <slug>.<hex>, pas sur
    # la valeur : il tient meme si le token apparait la ou on ne l'attend pas.
    #
    # `timeout` n'est pas decoratif : a ce stade le reseau est DEJA ferme. Toute
    # commande Hermes qui chercherait a joindre un fournisseur resterait pendue
    # jusqu'a son propre delai, et le provisionnement avec elle.
    PII_ECHEC=0
    hset() {
      if ! timeout 30 docker exec "$SLUG-agent" hermes config set "$1" "$2" 2>&1 \
           | sed -E "s@([a-z0-9-]+)\.[0-9a-f]{16,}@\1.<TOKEN-CAVIARDE>@g"; then
        PII_ECHEC=1
        echo "ATTENTION: 'hermes config set $1' a echoue." >&2
      fi
    }
    docker exec "$SLUG-agent" cp /home/hermes/.hermes/config.yaml \
      /home/hermes/.hermes/config.yaml.bak-avant-pack 2>/dev/null || true

    # ⚠️ Forme d'appel `hermes config set <cle> <valeur>` : c'est celle que le
    # 55 a employee a la main sur `sonde`, jamais rejouee par script. Si un
    # `hset` echoue en bloc, verifier d'abord la forme :
    #   sudo docker exec <slug>-agent hermes config set --help
    hset providers.mania-pii.base_url      "$URL_PII"
    hset providers.mania-pii.key_env       "OPENROUTER_API_KEY"
    hset providers.mania-pii.default_model "$MODELE_DEFAUT"
    hset providers.mania-pii.api_mode      "chat_completions"
    hset model.default                     "$MODELE_DEFAUT"
    hset model.provider                    "custom:mania-pii"

    # `model.base_url` est le champ que le selecteur de modele EFFACE
    # (Hermes #25107). On le retire : le routage doit venir du profil, pas d'une
    # URL nue toleree sous condition par _config_base_url_trustworthy_for_bare_custom.
    # Le motif cible EXACTEMENT deux espaces = le bloc `model:`. L'entree du
    # profil est indentee de quatre et ne peut pas matcher -- la supprimer
    # effacerait le profil qu'on vient d'ecrire.
    docker exec "$SLUG-agent" sed -i '/^  base_url: /d' /home/hermes/.hermes/config.yaml || true

    # `hermes config set` tourne en root via docker exec : rendre le fichier a
    # son proprietaire, sinon l'agent (uid 1000) ne peut plus l'ecrire.
    docker exec "$SLUG-agent" sh -c \
      'chown hermes:hermes /home/hermes/.hermes/config.yaml* 2>/dev/null || chown 1000:1000 /home/hermes/.hermes/config.yaml*' \
      >/dev/null 2>&1 || true

    if [ "$PII_ECHEC" = "0" ]; then
      PII_CABLE=1
      BESOIN_RESTART=1
      info "profil 'mania-pii' ecrit (base URL caviardee ci-dessus)"
    else
      echo "ATTENTION: cablage du profil INCOMPLET -- verifier a la main." >&2
    fi
  fi
elif [ "$PII" = "1" ]; then
  echo "ATTENTION: config.yaml absent -- profil PII NON cable." >&2
fi

if [ "${BESOIN_RESTART:-0}" = "1" ]; then
  info "redemarrage de l'agent pour recharger la config"
  ( cd "$BASE" && docker compose restart "$SLUG-agent" >/dev/null 2>&1 ) || true
  # attente de la reponse de l'agent apres redemarrage (pas juste 'running' :
  # l'API 8642 met quelques secondes a repondre -> sinon le check final tire trop tot).
  for _i in $(seq 1 40); do
    rcode="$(docker exec "$SLUG-webui" curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$SLUG-agent:8642/health" 2>/dev/null || echo 000)"
    [ "$rcode" = "200" ] && break
    sleep 3
  done
fi

# --- Reglages WebUI : nom affiche et langue ---------------------------------
# `bot_name` pilote le titre de l'ecran de connexion ET l'initiale du carre
# colore ; `language` pilote la langue de l'interface. Les deux SANS
# reconstruire l'image => une seule image pour tous les locataires.
# ⚠️ Le fichier n'existe qu'APRES la premiere connexion : on le cree ici.
#    L'application le FUSIONNE ensuite avec ses valeurs par defaut (verifie :
#    2 cles ecrites -> 78 cles apres connexion, les notres conservees).
SET_JSON="/home/hermeswebui/.hermes/webui/settings.json"
if docker exec "$SLUG-webui" sh -c "
  if [ -f '$SET_JSON' ]; then
    sed -i 's/\"bot_name\": \"[^\"]*\"/\"bot_name\": \"$NOM_AGENT\"/' '$SET_JSON'
    sed -i 's/\"language\": \"[^\"]*\"/\"language\": \"fr\"/' '$SET_JSON'
  else
    printf '{\n  \"bot_name\": \"$NOM_AGENT\",\n  \"language\": \"fr\"\n}\n' > '$SET_JSON'
    chown hermeswebui:hermeswebui '$SET_JSON' 2>/dev/null || true
    chmod 600 '$SET_JSON'
  fi" 2>/dev/null; then
  info "reglages WebUI ecrits (bot_name=$NOM_AGENT, langue=fr)"
else
  echo "ATTENTION: reglages WebUI non ecrits — l'ecran de connexion affichera 'Hermes'" >&2
fi

# --- 6. VERIFICATION DE LA ROUTE (le coeur de la v2) -------------------------
verifier_route() {
  curl -s -o /dev/null -w '%{http_code}' -k --max-time 10 "$URL" 2>/dev/null || echo "000"
}

info "verification de la route Traefik"
code=""
for i in $(seq 1 20); do
  code="$(verifier_route)"
  [ "$code" = "307" ] && break
  sleep 3
done

if [ "$code" != "307" ]; then
  echo
  echo "!! Route absente ou incomplete : HTTP $code (attendu 307)"
  case "$code" in
    404) echo "   404 = Traefik n'a AUCUNE route pour $SLUG.$DOMAINE_BASE." ;;
    502) echo "   502 = route presente mais backend injoignable (webui pas prete ?)." ;;
    000) echo "   000 = pas de reponse (DNS ? pare-feu ?)." ;;
  esac

  if [ "$code" = "404" ]; then
    echo "   Cause connue : le provider Docker de Traefik a cesse de decouvrir"
    echo "   les nouveaux conteneurs (panne silencieuse du 2026-07-19)."
    echo
    if [ "$AUTO" = "1" ]; then
      rep="o"
    else
      printf "   Redemarrer Traefik ? (coupe %s 2-5 s) [o/N] " "$DOMAINE_BASE"
      read -r rep || rep="n"
    fi
    if [ "$rep" = "o" ] || [ "$rep" = "O" ]; then
      info "redemarrage de Traefik"
      ( cd /opt/traefik && docker compose up -d --force-recreate )
      sleep 8
      for i in $(seq 1 20); do
        code="$(verifier_route)"
        [ "$code" = "307" ] && break
        sleep 3
      done
      [ "$code" = "307" ] && info "route retablie apres redemarrage" \
                          || echo "!! Toujours HTTP $code — investiguer manuellement" >&2
    else
      echo "   Redemarrage refuse. Le locataire est INJOIGNABLE tant que Traefik"
      echo "   n'a pas decouvert son conteneur."
    fi
  fi
fi

# --- 7. Verification de l'agent ----------------------------------------------
sante="$(docker exec "$SLUG-webui" curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
        "http://$SLUG-agent:8642/health" 2>/dev/null || echo "000")"

# --- 7-bis. Verification de la pseudonymisation ------------------------------
# CE QU'ON NE PEUT PAS TESTER ICI : la chaine complete. Le client n'a pas encore
# saisi sa cle LLM (4quater) -- `hermes -z` prendrait un 401 faute de cle, et
# l'echec ne dirait rien du cablage. Le test de bout en bout est un controle
# d'ACTIVATION, pas de provisionnement : il est dans le rapport ci-dessous.
# Ce qui EST verifiable sans cle, et qui est verifie ici :
PII_SORTIE=""; PII_INTERNE=""; PII_PROFIL=""
if [ "$PII" = "1" ]; then
  info "verification de la barriere egress"

  # 1. L'exterieur est ferme. Adresse IP LITTERALE, pas un nom d'hote : un echec
  #    DNS (curl 6) ne prouverait que la resolution. curl 7 prouve la couche IP.
  PII_SORTIE="$(docker exec "$SLUG-agent" sh -c \
    'curl -s -o /dev/null --max-time 8 https://1.1.1.1/ >/dev/null 2>&1; echo $?' 2>/dev/null || echo "?")"

  # 2. Le proxy repond. Sans ce second controle, le premier ne distingue pas
  #    « egress ferme » de « reseau mort » -- un conteneur totalement coupe
  #    donnerait exactement le meme resultat.
  PII_INTERNE="$(docker exec "$SLUG-agent" curl -s -o /dev/null -w '%{http_code}' \
    --max-time 8 "http://$PROXY_PII:$PORT_PII/health" 2>/dev/null || echo "000")"

  # 3. Le profil est bien celui qui sera utilise. On lit la ligne de selection,
  #    jamais la base URL (elle porte le token).
  #    Le motif tolere un guillemet eventuel du serialiseur YAML, mais exige les
  #    deux espaces d'indentation : ceux du bloc `model:`, pas ceux du profil.
  PII_PROFIL="$(docker exec "$SLUG-agent" sh -c \
    'grep -cE "^  provider: .?custom:mania-pii.?$" /home/hermes/.hermes/config.yaml || true' 2>/dev/null || echo "0")"
fi

# --- 8. Rapport --------------------------------------------------------------
cat <<EOF

=============================================================
  Locataire '$SLUG'   (pack: $PACK)
=============================================================
  URL                : $URL
  BasicAuth (secours) : $SLUG / $BASIC_PW
  Mot de passe WebUI : $WEBUI_PW

  >>> NOTE CES IDENTIFIANTS MAINTENANT (le .env est en 0600) <<<

  Route Traefik      : HTTP $code   $( [ "$code" = "307" ] && echo "OK" || echo "<<< A CORRIGER" )
  Agent /health      : HTTP $sante  $( [ "$sante" = "200" ] && echo "OK" || echo "<<< A CORRIGER" )
EOF

if [ "$PII" = "1" ]; then
cat <<EOF

  --- Pseudonymisation (pack '$PACK') ---
  Egress ferme       : curl=$PII_SORTIE  $( [ "$PII_SORTIE" = "7" ] && echo "OK (couche IP refusee)" || echo "<<< A CORRIGER (7 attendu)" )
  Proxy joignable    : HTTP $PII_INTERNE $( [ "$PII_INTERNE" = "200" ] && echo "OK" || echo "<<< A CORRIGER (200 attendu)" )
  Profil selectionne : $PII_PROFIL      $( [ "$PII_PROFIL" = "1" ] && echo "OK (custom:mania-pii)" || echo "<<< A CORRIGER (1 attendu)" )
  Section SOUL       : posee (# Pseudonymisation)

  Les deux premiers vont PAR PAIRE. « Egress ferme » seul ne prouve rien : un
  reseau mort donnerait le meme resultat. Il faut les deux pour distinguer
  « sorties refusees » de « conteneur coupe de tout ».

  >>> LA CHAINE COMPLETE N'EST PAS ENCORE TESTEE. <<<
  Elle ne peut pas l'etre ici : le client n'a pas encore saisi sa cle LLM, et
  la plateforme n'y touche pas (STACK 4quater). A passer APRES l'etape 1,
  c'est le controle d'ACTIVATION du locataire :

    sudo docker exec $SLUG-agent hermes -z "Bonjour"
    sudo docker logs $PROXY_PII --since 5m 2>&1 | grep PROBE

  Un PROBE doit apparaitre. S'il n'y en a pas, l'appel n'est PAS passe par le
  proxy -- et un appel qui ne passe pas par le proxy est un appel en clair.
EOF
fi

ETAPE_3=""
if [ "$PII" = "1" ]; then
  ETAPE_3="
   3. Controle d'ACTIVATION ci-dessus (un PROBE cote proxy) -- tant qu'il n'a
      pas ete passe, la pseudonymisation est cablee mais non prouvee."
fi

cat <<EOF

  Reste a faire :
   1. Ouvrir $URL et saisir la cle LLM depuis l'interface web.
   2. Verifier le certificat : curl -I $URL   (sans -k)$ETAPE_3

  Suppression (IRREVERSIBLE, detruit les donnees) :
   cd $BASE && docker compose down -v && rm -rf $BASE
=============================================================
EOF