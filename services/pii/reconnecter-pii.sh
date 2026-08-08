#!/usr/bin/env bash
# =============================================================================
#  reconnecter-pii.sh  —  raccorde mania-pii aux reseaux des locataires FERMES
# =============================================================================
#  POURQUOI CE SCRIPT EXISTE
#  Un locataire dont le reseau porte `internal: true` (barriere egress) n'a
#  AUCUNE route vers l'exterieur : ni DNS externe, ni couche IP. Son unique
#  interlocuteur joignable doit donc etre le proxy PII, raccorde a son reseau :
#      docker network connect <slug>_<slug>-net mania-pii
#
#  Ce raccordement est porte par le CONTENEUR mania-pii, pas par son compose.
#  Un `docker compose up -d --build` dans services/pii/ recree le conteneur et
#  PERD tous les raccordements -> chaque locataire ferme cesse d'atteindre le
#  proxy.
#  Le mode de defaillance est FAIL-CLOSED : l'agent echoue, il ne fuit pas
#  ("un agent muet se voit, une fuite silencieuse non"). Mais il faut le
#  reparer. C'est le role de ce script.
#
#  >>> A PASSER APRES TOUT REBUILD DU SERVICE PII. <<<
#
#  POURQUOI PAS DANS LE COMPOSE DU SERVICE PII
#  Y declarer les reseaux des locataires serait declaratif, donc plus robuste
#  en apparence — mais ce fichier est suivi par git. Chaque provisionnement
#  salirait le working tree de /opt/mania et rouvrirait la "danse du stash"
#  (dette STACK-2 n1, close au STACK-4 51). C'est le meme raisonnement qui a
#  sorti PII_PROBE_MODE du compose vers /opt/hermes/pii/.env.
#
#  LA REGLE — pour ne tenir AUCUNE liste
#  Aucune liste de locataires n'est maintenue nulle part. Le drapeau `internal`
#  du reseau EST la source de verite : un reseau de locataire ferme est, par
#  definition, un reseau qui a besoin du proxy. Les locataires non fermes sont
#  ignores (et signales, voir plus bas).
#  Les defauts de ce service sont toujours venus des listes -- de chemins, de
#  champs, de marqueurs. Celle-ci n'existe pas.
#
#  SUR
#    - Idempotent : rejouable sans effet de bord.
#    - Ne DECONNECTE jamais rien.
#    - Ne cree, ne modifie et ne supprime aucun reseau.
#    - --dry-run montre sans agir.
#
#  Usage :
#    sudo ./reconnecter-pii.sh
#    sudo ./reconnecter-pii.sh --dry-run
# =============================================================================
set -euo pipefail

PROXY="mania-pii"
DRY=0

case "${1:-}" in
  --dry-run) DRY=1 ;;
  "")        ;;
  *)         echo "usage: $0 [--dry-run]" >&2; exit 1 ;;
esac

err()  { echo "ERREUR: $*" >&2; exit 1; }
info() { echo "-- $*"; }

command -v docker >/dev/null 2>&1 || err "docker absent"
docker inspect "$PROXY" >/dev/null 2>&1 \
  || err "conteneur '$PROXY' introuvable - le service PII tourne-t-il ?"

# Reseaux deja rejoints par le proxy, en une chaine encadree d'espaces pour un
# test de mot exact (evite qu'un slug soit le prefixe d'un autre).
DEJA=" $(docker inspect "$PROXY" \
        --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')"

FERMES=0; RACCORDES=0; DEJA_OK=0
OUVERTS=""

while read -r RESEAU; do
  [ -n "$RESEAU" ] || continue

  # Un reseau de locataire se nomme <slug>_<slug>-net (convention posee par
  # nouveau-tenant.sh, et reprise telle quelle par desprovisionner-tenant.sh).
  # Test par reconstruction : exact, et sans backreference regex.
  SLUG="${RESEAU%%_*}"
  [ -n "$SLUG" ] || continue
  [ "$RESEAU" = "${SLUG}_${SLUG}-net" ] || continue

  INTERNE="$(docker network inspect "$RESEAU" --format '{{.Internal}}' 2>/dev/null || echo "?")"

  if [ "$INTERNE" != "true" ]; then
    # Locataire encore OUVERT sur l'exterieur : hors perimetre de ce script,
    # mais on le dit -- c'est une fuite potentielle des qu'il sera cablé.
    OUVERTS="$OUVERTS $SLUG"
    continue
  fi

  FERMES=$((FERMES + 1))

  case "$DEJA" in
    *" $RESEAU "*)
      DEJA_OK=$((DEJA_OK + 1))
      info "$SLUG : deja raccorde"
      continue
      ;;
  esac

  if [ "$DRY" = "1" ]; then
    info "$SLUG : A RACCORDER  (--dry-run : rien n'a ete fait)"
  else
    docker network connect "$RESEAU" "$PROXY"
    RACCORDES=$((RACCORDES + 1))
    info "$SLUG : raccorde"
  fi
done <<EOF
$(docker network ls --format '{{.Name}}')
EOF

echo
echo "============================================================="
echo "  Locataires fermes (internal)      : $FERMES"
echo "  Deja raccordes                    : $DEJA_OK"
if [ "$DRY" = "1" ]; then
echo "  A raccorder                       : $((FERMES - DEJA_OK))  (dry-run)"
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
