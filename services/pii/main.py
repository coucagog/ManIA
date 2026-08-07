"""
main.py — Proxy PII de MANIA, service partage (patron transcription/documents).

Role : s'intercale entre Hermes et le fournisseur LLM en exposant une API
OpenAI-compatible. Pseudonymise les identifiants AVANT l'appel amont, restaure
les valeurs reelles APRES.

Insertion cote tenant (opt-in par verticale, sans toucher l'image Hermes) :
    environment:
      - OPENAI_BASE_URL=https://pii.mania.sn/g/<slug>/<SHARED_SERVICES_TOKEN>/v1
    et config.yaml du tenant :  model.provider: openai
Le SHARED_SERVICES_TOKEN vaut "<slug>.<hmac_hex>" et est deja ecrit dans le .env
de chaque tenant depuis §38. La cle LLM du client reste dans Authorization et est
relayee intacte (§4quater : la plateforme ne detient jamais la cle du client).

/!\ EPHEMERE : aucun contenu de message n'est loggue, aucune table de
correspondance n'est persistee (portee requete, en memoire).

/!\ ETAT DU DURCISSEMENT (STACK-4 §54) : les TROIS voies de fuite du §50 sont
    FERMEES — liste blanche des chemins, `content` en blocs, `tool_calls` aux
    deux sens (cf. wire.py). Restent, avant de cabler un tenant reel :
      - le CABLAGE ROBUSTE (§53) : le detournement par `environment:` est
        incomplet par construction (#25107 efface la base URL au changement de
        modele, et la cle vit dans le profil de fournisseur) -> profil portant
        URL + cle, et barriere egress sur le conteneur agent ;
      - l'ACCESS LOG TRAEFIK, qui enregistre l'URL complete, token compris ;
      - les reconnaisseurs senegalais, toujours un TODO (§24).
    Deux limites assumees, a annoncer plutot qu'a masquer a moitie : la PII
    portee par une IMAGE n'est pas couverte, et le prompt systeme est hors
    perimetre (voir PSEUDO_SYSTEM ci-dessous).

Reglages (env) :
    SHARED_SERVICES_SECRET     secret maitre partage (obligatoire, §36)
    UPSTREAM_BASE_URL          amont OpenAI-compatible (defaut OpenRouter)
    PII_FAIL_CLOSED            "1" (defaut) = bloque un contenu sensible mal detecte
    PII_CHARS_PER_ENTITY       densite d'entites attendue (defaut 500) — seuil du
                               garde-fou, cf. pii_engine.assess_risk
    PII_PSEUDONYMIZE_SYSTEM    "1" = pseudonymise aussi `role: system` (v1)
    PII_PROBE_MODE             "1" = journalise l'arrivee d'un appel (forme, pas de
                               contenu) pour la sonde base_url ; forwarde quand meme
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

from pii_engine import (
    DEFAULT_CHARS_PER_ENTITY,
    CompositeDetector,
    Pseudonymizer,
    RegexDetector,
    assess_risk,
    resolve_overlaps,
)
from sse import completion_to_sse
from wire import (
    apply_to_slots,
    is_generative,
    is_passthrough_allowed,
    joined_text,
    normalise_path,
    slot_summary,
    text_slots,
)

try:
    # Presidio n'est present que sur le VPS ; en son absence, on tourne en
    # regex-seul (degrade mais fail-closed grace a assess_risk).
    from presidio_adapter import PresidioDetector
    _NER_AVAILABLE = True
except Exception:  # pragma: no cover - depend de l'environnement
    PresidioDetector = None  # type: ignore
    _NER_AVAILABLE = False


log = logging.getLogger("mania-pii")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

SECRET = os.environ.get("SHARED_SERVICES_SECRET", "").encode()
UPSTREAM = os.environ.get("UPSTREAM_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
FAIL_CLOSED = os.environ.get("PII_FAIL_CLOSED", "1") == "1"
PROBE = os.environ.get("PII_PROBE_MODE", "0") == "1"

# Seuil du garde-fou : une entite attendue par tranche de N caracteres de texte
# reconnu sensible. Reglable parce que c'est une heuristique NON CALIBREE (aucun
# corpus reel) — a reviser sur des blocages reellement observes, pas au jugé.
try:
    CHARS_PER_ENTITY = int(os.environ.get("PII_CHARS_PER_ENTITY", "") or DEFAULT_CHARS_PER_ENTITY)
except ValueError:
    # Une valeur illisible ne doit pas DESARMER le garde-fou en silence.
    log.warning("PII_CHARS_PER_ENTITY illisible -> defaut %d", DEFAULT_CHARS_PER_ENTITY)
    CHARS_PER_ENTITY = DEFAULT_CHARS_PER_ENTITY

# --------------------------------------------------------------------------- #
#  Prompt systeme : PSEUDONYMISE OU NON ?
#
#  Question laissee ouverte par la revue (ANALYSE-PII §4), TRANCHEE par la
#  mesure du 2026-08-06 : la sonde a journalise `entites=162` sur un message
#  utilisateur qui n'en portait que 3. Les 159 autres venaient du prompt
#  systeme (le SOUL/AGENTS.md du locataire). Autrement dit, les INSTRUCTIONS de
#  l'agent partaient au modele reduites en [NOM_1]/[ADRESSE_7]/[DATE_12] — un
#  agent qui ne sait plus qui il est ni pour qui il travaille.
#
#  Defaut retenu : NE PAS pseudonymiser `role: system`. Justification — ce
#  prompt est redige par MANIA et le locataire au provisionnement ; il porte
#  l'identite du CABINET (praticien, raison sociale, coordonnees), pas les
#  donnees de ses clients. C'est precisement ce que le locataire choisit
#  d'exposer a SON fournisseur, avec SA cle (§4quater). Le secret professionnel
#  qu'on protege vit dans la CONVERSATION, pas dans les instructions.
#
#  /!\ Ce n'est pas un defaut anodin : un locataire qui collerait des donnees
#  patient dans son SOUL les verrait partir en clair. A rappeler dans la doc
#  d'onboarding. Mettre PII_PSEUDONYMIZE_SYSTEM=1 pour revenir au comportement
#  v1 (agent degrade, mais rien d'exclu).
# --------------------------------------------------------------------------- #
PSEUDO_SYSTEM = os.environ.get("PII_PSEUDONYMIZE_SYSTEM", "0") == "1"

if not SECRET:
    # Meme garde-fou volontaire que transcription/documents : refuser de
    # demarrer sans auth plutot que d'accepter n'importe quel token en silence.
    raise RuntimeError("SHARED_SERVICES_SECRET manquant — refus de demarrer (fail-closed)")

_HTTP_TIMEOUT = httpx.Timeout(300.0, connect=10.0)

# --------------------------------------------------------------------------- #
#  Detecteur : UNE SEULE instance pour tout le processus.
#
#  Presidio charge un modele spaCy ; l'instancier par requete coutait plusieurs
#  secondes ET un pic memoire par appel concurrent, contre mem_limit=1536m sur
#  un VPS SANS SWAP -> OOM probable (STACK-4 §50, defaut n°2). C'est aussi
#  l'argument meme du conteneur PARTAGE (§16) : le modele est charge une fois.
#
#  Corollaire : spaCy n'est pas sur en acces concurrent, et `analyze` est un
#  appel bloquant. On serialise donc les detections dans un pool a UN worker —
#  meme doctrine que transcription (« file bornee, pas de parallelisme libre »).
#  Effet de bord voulu : /health reste repondant pendant une detection longue.
# --------------------------------------------------------------------------- #
_DETECTOR: CompositeDetector | None = None
_EXECUTOR: ThreadPoolExecutor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _DETECTOR, _EXECUTOR
    dets: list = [RegexDetector()]
    if _NER_AVAILABLE and PresidioDetector is not None:
        log.info("chargement Presidio + spaCy (une seule fois, au demarrage)...")
        dets.append(PresidioDetector())
        log.info("Presidio pret")
    else:
        log.warning("Presidio absent -> mode REGEX-SEUL (noms/adresses non detectes)")
    _DETECTOR = CompositeDetector(dets)
    _EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pii-detect")
    log.info("mania-pii pret — amont=%s fail_closed=%s probe=%s", UPSTREAM, FAIL_CLOSED, PROBE)
    yield
    _EXECUTOR.shutdown(wait=True)
    _EXECUTOR = None
    _DETECTOR = None


app = FastAPI(title="mania-pii", lifespan=lifespan)


@app.middleware("http")
async def _journal_sans_token(request: Request, call_next):
    """Journalise la FORME de chaque requete, jamais le token.

    Le log d'acces d'uvicorn est coupe (--no-access-log, cf. Dockerfile) parce
    qu'il imprime le chemin complet — or le token voyage dedans, et c'est le
    meme qui ouvre transcription et documents. On le remplace ici par une ligne
    equivalente avec le segment caviarde.

    Indispensable a la sonde : sans elle, une requete qui arriverait mais
    n'atteindrait pas PROBE (mauvais chemin, 401) ne laisserait AUCUNE trace, et
    l'absence de log serait lue a tort comme « Hermes n'a pas suivi la base URL ».
    """
    response = await call_next(request)
    parts = request.url.path.split("/")
    if len(parts) > 3 and parts[1] == "g":
        parts[3] = "<token>"
    # `auth=` : PRESENCE seule de l'en-tete Authorization, jamais sa valeur ni
    # sa longueur. Ajoute apres un 401 « Missing Authentication header » renvoye
    # par l'amont : sans ce temoin, impossible de distinguer « le client n'a
    # envoye aucune cle » de « le proxy l'a perdue en route » — les deux
    # donnent exactement la meme erreur, et on ne peut pas relire l'en-tete
    # apres coup. Le meme doute couterait un aller-retour a chaque incident.
    log.info("%s %s -> %s (auth=%s)", request.method, "/".join(parts),
             response.status_code, "oui" if request.headers.get("authorization") else "NON")
    return response


async def _in_pool(fn, *args):
    """Execute un traitement CPU-bound dans le pool a 1 worker."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_EXECUTOR, fn, *args)


def _verify(slug: str, token: str) -> None:
    """Verifie le token des services partages.

    Format du projet (STACK-3 §1, identique a transcription/documents) :
        SHARED_SERVICES_TOKEN = "<slug>.<hmac_hex>"
        hmac = HMAC-SHA256(SHARED_SERVICES_SECRET, slug)

    /!\ La v1 comparait le token ENTIER au seul hmac -> 401 systematique, et la
    sonde base_url aurait conclu a tort qu'Hermes n'honore pas OPENAI_BASE_URL
    (STACK-4 §50, defaut n°1). On decoupe donc comme transcription/main.py:104,
    puis on croise le slug porte par le token avec celui du chemin.
    """
    token_slug, _, presented_hex = token.rpartition(".")
    # `presented_hex.isascii()` : les segments d'URL peuvent porter du non-ASCII,
    # or compare_digest leve un TypeError dessus -> ce serait un 500, pas un 401.
    if not token_slug or not presented_hex or not presented_hex.isascii():
        raise HTTPException(status_code=401, detail="token malforme")
    expected_hex = hmac.new(SECRET, token_slug.encode("utf-8"), hashlib.sha256).hexdigest()
    # Temps constant sur le HMAC seul : le slug n'est pas un secret (c'est le
    # sous-domaine du locataire), une comparaison simple suffit et evite le piege
    # ci-dessus.
    if not hmac.compare_digest(expected_hex, presented_hex) or token_slug != slug:
        raise HTTPException(status_code=401, detail="token invalide")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if _DETECTOR is not None else "starting",
        "upstream": UPSTREAM,
        "ner": "presidio" if _NER_AVAILABLE else "regex-only",
        "fail_closed": FAIL_CLOSED,
        "probe": PROBE,
    }


@app.api_route("/g/{slug}/{token}/v1/{path:path}", methods=["GET", "POST"])
async def proxy(
    slug: str,
    token: str,
    path: str,
    request: Request,
    authorization: str | None = Header(default=None),
) -> Response:
    _verify(slug, token)

    if _DETECTOR is None:  # pragma: no cover - fenetre de demarrage
        raise HTTPException(status_code=503, detail="detecteur pas encore charge")

    # --- Liste blanche des chemins (fuite n°1, fermee au §54) ---------------
    # DENY BY DEFAULT : seul `POST chat/completions` est traite, seuls les GET
    # de la liste blanche traversent. La v1 relayait BRUT tout ce qu'elle ne
    # savait pas traiter -> /v1/embeddings (vectoriser un dossier client) et
    # /v1/completions partaient en clair, et toute nouveaute d'API amont serait
    # devenue une fuite sans qu'on ait rien change.
    # Une seule forme canonique pour comparer ET pour emettre : un slash de tete
    # donnerait `<amont>/v1//chat/completions`, que des fournisseurs refusent.
    path = normalise_path(path)

    if not is_generative(request.method, path):
        if is_passthrough_allowed(request.method, path):
            return await _passthrough(path, request, authorization)
        log.warning("chemin refuse tenant=%s %s %s", slug, request.method, path)
        return JSONResponse(
            status_code=403,
            content={"error": {
                "type": "pii_chemin_non_supporte",
                # Le chemin est NOMME : un besoin legitime futur doit se
                # diagnostiquer en lisant l'erreur, pas en fouillant le code.
                "message": (
                    f"Chemin '{request.method} {path}' non supporte par le proxy PII : "
                    "il ne saurait pas y pseudonymiser les identifiants. "
                    "Seul /v1/chat/completions est traite."
                ),
            }},
        )

    body = await request.json()

    # --- Streaming : accepte, mais servi en UN evenement (STACK-4 §53) -------
    # La v1 refusait `stream: true` (400) en pariant sur le
    # `streaming.enabled: false` des tenants. LA SONDE A INVALIDE CE PARI : la
    # requete arrive avec `stream: true` malgre ce reglage — il ne gouverne pas
    # le champ envoye a l'API. Et faire tenir la conformite a un reglage que le
    # client peut rebasculer d'un clic, sans savoir qu'il desactive alors la
    # pseudonymisation, n'est pas vendable.
    #
    # On accepte donc, SANS pseudonymiser au fil de l'eau : un jeton [NOM_1]
    # peut etre coupe entre deux chunks amont, et `restore` (un str.replace sur
    # le texte complet) ne matcherait plus rien -> jeton livre tel quel au
    # client, valeur reelle jamais reinjectee. On appelle donc l'amont en
    # non-streame (chemin deja prouve), on restaure, et on re-emet en SSE.
    # Prix assume : pas d'affichage progressif. A remplacer par un vrai flux
    # avec tampon anti-coupure-de-jeton quand ce sera la gene principale.
    stream = bool(body.pop("stream", False))
    body.pop("stream_options", None)  # sans `stream`, l'amont le rejetterait

    eng = Pseudonymizer(_DETECTOR)
    messages = body.get("messages", [])

    # --- Perimetre de traitement (fuites n°2 et n°3, fermees au §54) --------
    # UNE SEULE enumeration des emplacements de texte (wire.text_slots), qui
    # sert a la fois au calcul de risque et au masquage. La v1 en avait deux,
    # ecrites en dur et divergentes : le `content` en blocs n'etait ni masque
    # ni meme COMPTE par assess_risk — le garde-fou mesurait autre chose que
    # ce qu'il protegeait. Les slots pointent DANS `body`, donc les ecrire
    # reecrit le corps envoye a l'amont.
    #
    # Le prompt systeme reste hors perimetre par defaut (cf. PSEUDO_SYSTEM en
    # tete de module) ; c'est `include_system` qui porte cette exclusion.
    slots = text_slots(messages, include_system=PSEUDO_SYSTEM)

    # Evaluation de risque sur le texte concatene (garde-fou fail-closed).
    joined = joined_text(slots)
    ents = await _in_pool(lambda t: resolve_overlaps(_DETECTOR.detect(t)), joined)
    risk = assess_risk(joined, ents, chars_per_entity=CHARS_PER_ENTITY)
    if FAIL_CLOSED and risk.suspicious_low_detection:
        log.warning(
            "appel bloque (fail-closed) tenant=%s : contenu sensible, %d entite(s) pour %d attendue(s)",
            slug, risk.entity_count, risk.expected_entity_count,
        )
        return JSONResponse(
            status_code=422,
            content={"error": {
                "type": "pii_fail_closed",
                # Chiffres repris dans le message : un blocage doit etre
                # explicable au locataire, sinon il est vecu comme une panne.
                "message": (
                    "Contenu sensible avec detection PII insuffisante "
                    f"({risk.entity_count} entite(s) detectee(s), {risk.expected_entity_count} attendue(s)) "
                    "— appel bloque."
                ),
            }},
        )

    # Pseudonymisation de tous les slots avec UNE table pour toute la requete
    # (une meme valeur -> un meme jeton d'un message a l'autre, et jusque dans
    # les arguments d'outil).
    await _in_pool(apply_to_slots, slots, eng.pseudonymize)

    if PROBE:
        log.info("PROBE ok tenant=%s msgs=%d slots=[%s] entites=%d stream=%s systeme=%s",
                 slug, len(messages), slot_summary(slots), risk.entity_count, stream,
                 "pseudonymise" if PSEUDO_SYSTEM else "exclu")

    upstream_json = await _forward(path, body, authorization)

    # Restauration des valeurs reelles dans la reponse.
    # /!\ Sur TOUT le message, pas seulement `content` : le premier appel reel
    # a montre que le texte vit aussi dans `reasoning`, `reasoning_details[]`
    # et — pour un agent — `tool_calls[].function.arguments`. Ces champs
    # revenaient au client avec [NOM_1]/[TEL_1] bruts.
    for choice in upstream_json.get("choices", []):
        if isinstance(choice.get("message"), dict):
            choice["message"] = eng.restore_deep(choice["message"])

    if stream:
        # La restauration ci-dessus a deja eu lieu : le flux ne transporte que
        # des valeurs reelles, jamais des jetons a recoller cote client.
        return StreamingResponse(
            completion_to_sse(upstream_json),
            media_type="text/event-stream",
            # `no-cache` + `X-Accel-Buffering: no` : Traefik est devant, et un
            # intermediaire qui tamponnerait retiendrait tout le flux.
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return JSONResponse(content=upstream_json)


async def _forward(path: str, body: dict, authorization: str | None) -> dict:
    headers = {"Content-Type": "application/json"}
    if authorization:  # cle du client relayee intacte
        headers["Authorization"] = authorization
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        r = await client.post(f"{UPSTREAM}/{path}", json=body, headers=headers)
    if r.status_code >= 400:
        # On REMONTE le corps de l'amont : sans lui, diagnostiquer la sonde
        # revient a deviner (cle invalide ? modele inconnu ? quota ?).
        # Le contenu eventuel y est pseudonymise, jamais les valeurs reelles.
        raise HTTPException(status_code=r.status_code, detail=r.text[:2000])
    return r.json()


async def _passthrough(path: str, request: Request, authorization: str | None) -> Response:
    """Relais brut — reserve aux chemins de `wire._PASSTHROUGH_GET`.

    /!\ Ne JAMAIS appeler cette fonction sans etre passe par
    `is_passthrough_allowed` : elle ne masque rien. C'est en l'appelant par
    defaut que la v1 laissait /v1/embeddings partir en clair (fuite n°1).
    """
    headers = {}
    if authorization:
        headers["Authorization"] = authorization
    raw = await request.body()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        r = await client.request(
            request.method, f"{UPSTREAM}/{path}", content=raw, headers=headers
        )
    return Response(content=r.content, status_code=r.status_code,
                    media_type=r.headers.get("content-type", "application/json"))
