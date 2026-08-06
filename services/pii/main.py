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

/!\ ETAT DU DURCISSEMENT (STACK-4 §50) — NE PAS CABLER UN TENANT REEL :
    trois voies de fuite connues restent OUVERTES a ce stade, volontairement
    (la sonde base_url doit d'abord prouver que le point d'insertion existe) :
      1. les chemins hors chat/completions sont relayes BRUTS (pas de liste
         blanche) — /v1/embeddings, /v1/completions partent en clair ;
      2. les `content` en blocs ([{"type":"text",...}]) ne sont pas masques ;
      3. les tool_calls ne sont ni masques a l'aller ni restaures au retour.
    Ce service n'est utilisable que par un tenant JETABLE sans donnee reelle
    tant que ces trois points ne sont pas fermes.

Reglages (env) :
    SHARED_SERVICES_SECRET   secret maitre partage (obligatoire, §36)
    UPSTREAM_BASE_URL        amont OpenAI-compatible (defaut OpenRouter)
    PII_FAIL_CLOSED          "1" (defaut) = bloque un contenu sensible mal detecte
    PII_PROBE_MODE           "1" = journalise l'arrivee d'un appel (forme, pas de
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
    CompositeDetector,
    Pseudonymizer,
    RegexDetector,
    assess_risk,
    resolve_overlaps,
)
from sse import completion_to_sse

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
    log.info("%s %s -> %s", request.method, "/".join(parts), response.status_code)
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

    # Chemins non generatifs (ex. /models) : passthrough integral.
    # /!\ PAS de liste blanche a ce stade (fuite n°1 documentee en en-tete).
    if request.method == "GET" or not path.startswith("chat/completions"):
        return await _passthrough(path, request, authorization)

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

    # Perimetre de traitement : par defaut le prompt systeme en est EXCLU
    # (cf. PSEUDO_SYSTEM en tete de module — l'exclure evite de reduire les
    # instructions de l'agent en jetons, et allege du meme coup la detection,
    # le prompt systeme etant l'essentiel du volume de texte).
    traites = [
        m for m in messages
        if PSEUDO_SYSTEM or m.get("role") != "system"
    ]

    # Evaluation de risque sur le texte concatene (garde-fou fail-closed).
    joined = "\n".join(
        m.get("content", "") for m in traites if isinstance(m.get("content"), str)
    )
    ents = await _in_pool(lambda t: resolve_overlaps(_DETECTOR.detect(t)), joined)
    risk = assess_risk(joined, ents)
    if FAIL_CLOSED and risk.suspicious_low_detection:
        log.warning("appel bloque (fail-closed) tenant=%s : contenu sensible, detection nulle", slug)
        return JSONResponse(
            status_code=422,
            content={"error": {
                "type": "pii_fail_closed",
                "message": "Contenu sensible avec detection PII insuffisante — appel bloque.",
            }},
        )

    # Pseudonymisation de chaque message avec UNE table pour toute la requete.
    for m in traites:
        c = m.get("content")
        if isinstance(c, str):
            m["content"] = await _in_pool(eng.pseudonymize, c)

    if PROBE:
        log.info("PROBE ok tenant=%s msgs=%d/%d entites=%d stream=%s systeme=%s",
                 slug, len(traites), len(messages), risk.entity_count, stream,
                 "pseudonymise" if PSEUDO_SYSTEM else "exclu")

    upstream_json = await _forward(path, body, authorization)

    # Restauration des valeurs reelles dans la reponse.
    for choice in upstream_json.get("choices", []):
        msg = choice.get("message", {})
        if isinstance(msg.get("content"), str):
            msg["content"] = eng.restore(msg["content"])

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
