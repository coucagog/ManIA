#!/usr/bin/env bash
# =============================================================================
#  reconnecter-services.sh  —  raccorde les services PARTAGES aux reseaux des
#                              locataires FERMES
# =============================================================================
#  (anciennement reconnecter-pii.sh : le probleme n'etait pas propre au proxy)
#
#  POURQUOI CE SCRIPT EXISTE
#  Un locataire dont le reseau porte `internal: true` (barriere egress) n'a
#  AUCUNE route vers l'exterieur : ni DNS externe, ni couche IP. Aucun nom
#  d'hote public ne lui est resolvable -- pas meme les notres. Ses seuls
#  interlocuteurs joignables sont les services partages raccordes a son reseau :
#      docker network connect <slug>_<slug>-net mania-pii
#      docker network connect <slug>_<slug>-net mania-transcription
#      docker network connect <slug>_<slug>-net mania-documents
#
#  Ce raccordement est porte par le CONTENEUR du service, pas par son compose.
#  Un `docker compose up -d --build` dans services/<svc>/ recree le conteneur et
#  PERD tous les raccordements -> chaque locataire ferme cesse de l'atteindre.
#  Le mode de defaillance est FAIL-CLOSED : l'agent echoue, il ne fuit pas
#  ("un agent muet se voit, une fuite silencieuse non"). Mais il faut le
#  reparer. C'est le role de ce script.
#
#  >>> A PASSER APRES TOUT REBUILD D'UN SERVICE PARTAGE. <<<
#
#  ⚠️ LE RACCORDEMENT NE SUFFIT PAS POUR LA TRANSCRIPTION
#  L'agent doit aussi APPELER le nom interne. Le wrapper installe par
#  nouveau-tenant.sh lit `MANIA_STT_URL` dans l'environnement du conteneur ;
#  sur un locataire ferme cette variable doit valoir
#      http://mania-transcription:8000/v1/transcribe
#  Un locataire ferme AVANT cette version appelle encore
#  `https://transcription.mania.sn/...`, qui n'est plus resolvable : ce script
#  le detecte et le signale, il ne peut pas le corriger (c'est une ligne du
#  compose du locataire, donc un redemarrage).
#
#  POURQUOI PAS DANS LE COMPOSE DES SERVICES
#  Y declarer les reseaux des locataires serait declaratif, donc plus robuste
#  en apparence — mais ces fichiers sont suivis par git. Chaque provisionnement
#  salirait le working tree de /opt/mania et rouvrirait la "danse du stash"
#  (dette STACK-2 n1, close au STACK-4 51). C'est le meme raisonnement qui a
#  sorti PII_PROBE_MODE du compose vers /opt/hermes/pii/.env.
#
#  LA REGLE — pour ne tenir AUCUNE liste de locataires
#  Aucune liste de locataires n'est maintenue nulle part. Le drapeau `internal`
#  du reseau EST la source de verite : un reseau de locataire ferme est, par
#  definition, un reseau qui a besoin des services partages. Les locataires non
#  fermes sont ignores (et signales, voir plus bas).
#  Les defauts de ce service sont toujours venus des listes -- de chemins, de
#  champs, de marqueurs. Celle des locataires n'existe pas.
#  La liste des SERVICES, elle, existe : elle est courte, fermee, et vit ici
#  (variable SERVICES). Un service absent est signale, jamais devine.
#
#  SUR
#    - Idempotent : rejouable sans effet de bord.
#    - Ne DECONNECTE jamais rien.
#    - Ne cree, ne modifie et ne supprime aucun reseau.
#    - --dry-run montre sans agir.
#
#  Usage :
#    sudo ./reconnecter-services.sh
#    sudo ./reconnecter-services.sh --dry-run
# =============================================================================
set -euo pipefail

SERVICES="mania-pii mania-transcription mania-documents"
DRY=0

case "${1:-}" in
  --dry-run) DRY=1 ;;
  "")        ;;
  *)         echo "usage: $0 [--dry-run]" >&2; exit 1 ;;
esac

err()  { echo "ERREUR: $*" >&2; exit 1; }
info() { echo "-- $*"; }

command -v docker >/dev/null 2>&1 || err "docker absent"

PRESENTS=""
ABSENTS=""
for SVC in $SERVICES; do
  if docker inspect "$SVC" >/dev/null 2>&1; then
    PRESENTS="$PRESENTS $SVC"
  else
    ABSENTS="$ABSENTS $SVC"
  fi
done
[ -n "$PRESENTS" ] || err "aucun service partage ne tourne ($SERVICES)"

FERMES=0; RACCORDES=0; DEJA_OK=0
OUVERTS=""
STT_A_CORRIGER=""

while read -r RESEAU; do
  [ -n "$RESEAU" ] || continue

  # Un reseau de locataire se nomme <slug>_<slug>-net (convention posee par
  # nouveau-tenant.sh, et reprise telle quelle par desprovisionner-tenant.sh).
  # Test par reconstruction : exact, et sans backreference regex.
  SLUG="${RESEAU%%_*}"
  [ -n "$SLUG" ] || continue
  [ "$RESEAU" = "${SLUG}_${SLUG}-net" ] || continue

  # Un seul inspect pour les deux questions : le reseau est-il ferme, et qui en
  # est deja membre. On interroge le RESEAU sur ses membres plutot que chaque
  # service sur ses reseaux -- meme reponse, une source au lieu de trois.
  INFOS="$(docker network inspect "$RESEAU" \
    --format '{{.Internal}}|{{range $k,$v := .Containers}}{{$v.Name}} {{end}}' 2>/dev/null || echo "?|")"
  INTERNE="${INFOS%%|*}"
  MEMBRES=" ${INFOS#*|}"

  if [ "$INTERNE" != "true" ]; then
    # Locataire encore OUVERT sur l'exterieur : hors perimetre de ce script,
    # mais on le dit -- c'est une fuite potentielle des qu'il sera cablé.
    OUVERTS="$OUVERTS $SLUG"
    continue
  fi

  FERMES=$((FERMES + 1))

  for SVC in $PRESENTS; do
    case "$MEMBRES" in
      *" $SVC "*)
        DEJA_OK=$((DEJA_OK + 1))
        info "$SLUG / $SVC : deja raccorde"
        continue
        ;;
    esac

    if [ "$DRY" = "1" ]; then
      info "$SLUG / $SVC : A RACCORDER  (--dry-run : rien n'a ete fait)"
    elif docker network connect "$RESEAU" "$SVC" 2>/dev/null; then
      RACCORDES=$((RACCORDES + 1))
      info "$SLUG / $SVC : raccorde"
    else
      # Arrive si le service est attache mais a l'arret : .Containers ne liste
      # que les conteneurs en cours d'execution.
      info "$SLUG / $SVC : raccordement refuse (deja attache, service arrete ?)"
    fi
  done

  # Le raccordement reseau ne sert a rien si l'agent appelle encore le nom
  # d'hote public. Verifiable sans rien casser : la variable est dans
  # l'environnement du conteneur.
  URL_STT="$(docker inspect "$SLUG-agent" \
    --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | sed -n 's/^MANIA_STT_URL=//p' || true)"
  case "$URL_STT" in
    http://mania-transcription:*) ;;
    *) STT_A_CORRIGER="$STT_A_CORRIGER $SLUG" ;;
  esac
done <<EOF
$(docker network ls --format '{{.Name}}')
EOF

echo
echo "============================================================="
echo "  Locataires fermes (internal)      : $FERMES"
echo "  Services partages presents        :$PRESENTS"
if [ -n "$ABSENTS" ]; then
echo "  Services ABSENTS (non raccordes)  :$ABSENTS"
fi
echo "  Raccordements deja en place       : $DEJA_OK"
if [ "$DRY" = "1" ]; then
echo "  A raccorder                       : (dry-run)"
else
echo "  Raccordes a l'instant             : $RACCORDES"
fi
if [ -n "$OUVERTS" ]; then
echo
echo "  ATTENTION - locataires NON fermes :$OUVERTS"
echo "  Leur reseau est internal=false : ils atteignent l'exterieur en direct."
echo "  Tant qu'ils ne sont pas cables au proxy, ce n'est pas une fuite du"
echo "  dispositif ; des qu'ils le seront, c'en sera une. Fermer le reseau"
echo "  AVANT de cabler, jamais l'inverse."
fi
if [ -n "$STT_A_CORRIGER" ]; then
echo
echo "  ATTENTION - transcription CASSEE sur :$STT_A_CORRIGER"
echo "  Ces locataires sont fermes mais leur agent appelle encore le nom d'hote"
echo "  public de la transcription, qui n'est plus resolvable chez eux."
echo "  Correctif (une ligne dans /opt/hermes/<slug>/docker-compose.yml, sous"
echo "  environment: de <slug>-agent), puis 'docker compose up -d' :"
echo "      - MANIA_STT_URL=http://mania-transcription:8000/v1/transcribe"
echo "  (jamais 'docker compose down -v' : cela detruit hermes-home)"
fi
echo "============================================================="

if [ "$FERMES" = "0" ]; then
  echo
  echo "Aucun locataire ferme : rien a faire."
  exit 0
fi

cat <<'EOF'

Controle qui prouve (a passer sur un locataire ferme, ici <slug>) :
  sudo docker exec <slug>-agent sh -lc 'curl -s -o /dev/null -w "interne=%{http_code}\n" --max-time 8 http://mania-pii:8000/health'
  sudo docker exec <slug>-agent sh -lc 'curl -s -o /dev/null -w "sortie=%{http_code}\n" --max-time 8 https://1.1.1.1/; echo "curl=$?"'

Attendu : interne=200  ET  sortie=000 avec curl=7.
Le premier seul ne prouve rien -- un conteneur totalement coupe donnerait le
meme echec au second. Il faut les DEUX pour distinguer "egress ferme" de
"reseau mort".
EOF
