"""
mania-provisiond — démon de provisioning côté HÔTE (Option 1, ASYNCHRONE).

Le provisioning prend 60-90 s (attente healthy + redemarrage agent). Un appel
synchrone derriere Traefik risquerait le timeout -> on rend le demon ASYNCHRONE :
  POST /v1/provision    -> demarre un job, renvoie {job_id} IMMEDIATEMENT
  POST /v1/deprovision  -> idem (exige confirm=true)
  GET  /v1/jobs/<id>    -> etat du job (running | done | error) + resultat
  GET  /health

mania-app relaie le demarrage (reponse instantanee) puis SONDE /v1/jobs/<id>
toutes les ~3 s -> chaque requete est courte, aucun risque de timeout Traefik.

Securite : socket UNIX (aucun reseau), secret d'admin (compare_digest), argv
sans shell (pas d'injection), slug/champs valides, operations SERIALISEES (une a
la fois via un verrou), timeout par operation.
"""

from __future__ import annotations

import asyncio
import hmac
import logging
import os
import re
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
PROVISIOND_SECRET = os.environ.get("PROVISIOND_SECRET", "")
NOUVEAU_SCRIPT = os.environ.get("NOUVEAU_SCRIPT", "/opt/hermes/gabarit/nouveau-tenant.sh")
DESPROV_SCRIPT = os.environ.get("DESPROV_SCRIPT", "/opt/hermes/gabarit/desprovisionner-tenant.sh")
HERMES_BASE = os.environ.get("HERMES_BASE", "/opt/hermes")
DOMAINE_BASE = os.environ.get("DOMAINE_BASE", "mania.sn")
OP_TIMEOUT_S = int(os.environ.get("OP_TIMEOUT_S", "300"))
JOBS_MAX = int(os.environ.get("JOBS_MAX", "200"))
PENDING_MAX = int(os.environ.get("PENDING_MAX", "8"))

# ⚠️ DOIT rester identique à la liste de nouveau-tenant.sh. Elle en divergeait :
# le démon laissait passer « transcription », « documents » et « pii » — noms de
# nos services partagés — que le script refusait ensuite. Pas un trou (le script
# tranchait), mais un refus tardif et illisible, après la création du job.
# Le script, lui, ignorait « app » et « mail ». Union des deux, des deux côtés.
RESERVED = {"mania", "traefik", "www", "api", "admin", "app", "mail",
            "transcription", "documents", "pii"}
SLUG_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
FREETEXT_MAX = 200

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("mania-provisiond")

_lock = asyncio.Lock()          # une operation de script a la fois
_tasks: set = set()             # garde une reference aux taches de fond (anti-GC)
JOBS: dict = {}                 # job_id -> dict d'etat

app = FastAPI(title="mania-provisiond", docs_url=None, redoc_url=None, openapi_url=None)


# --------------------------------------------------------------------------
# Auth + validation
# --------------------------------------------------------------------------
def verify_secret(authorization: Optional[str]) -> None:
    if not PROVISIOND_SECRET:
        raise HTTPException(status_code=500, detail="démon mal configuré (secret absent)")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="secret manquant")
    presented = authorization[len("Bearer "):].strip()
    if not hmac.compare_digest(presented, PROVISIOND_SECRET):
        raise HTTPException(status_code=401, detail="secret invalide")


def validate_slug(slug: str) -> None:
    if not slug or not SLUG_RE.match(slug):
        raise HTTPException(status_code=400, detail="slug invalide (minuscules, chiffres, tirets ; pas de tiret en bord)")
    if slug in RESERVED:
        raise HTTPException(status_code=400, detail=f"slug réservé: {slug}")


def clean_freetext(label: str, value: str) -> str:
    if value is None:
        raise HTTPException(status_code=400, detail=f"{label} manquant")
    if len(value) > FREETEXT_MAX:
        raise HTTPException(status_code=400, detail=f"{label} trop long (max {FREETEXT_MAX})")
    if any(ord(c) < 32 for c in value):
        raise HTTPException(status_code=400, detail=f"{label} contient des caractères invalides")
    return value


# --------------------------------------------------------------------------
# Modèles
# --------------------------------------------------------------------------
class ProvisionReq(BaseModel):
    slug: str
    name: str
    sector: str = "assistance generale"
    agent_name: str = "Ridwan"
    owner_email: str
    pack: str = "generique"
    # ÉLÈVE le niveau, ne l'abaisse jamais. Le pack (= le secteur déclaré par le
    # prospect) peut déjà exiger la pseudonymisation ; ce drapeau ne fait que
    # l'imposer quand il ne l'exige pas. Il n'existe volontairement AUCUN
    # moyen de l'éteindre depuis le réseau : retirer la pseudonymisation d'un
    # locataire est une décision de conformité, pas un champ JSON.
    pii: bool = False


class DeprovisionReq(BaseModel):
    slug: str
    confirm: bool = False


# --------------------------------------------------------------------------
# Jobs
# --------------------------------------------------------------------------
def _pending_count() -> int:
    return sum(1 for j in JOBS.values() if j["status"] == "running")


def _new_job(jtype: str, slug: str) -> str:
    if _pending_count() >= PENDING_MAX:
        raise HTTPException(status_code=429, detail="trop d'opérations en attente — réessayer plus tard")
    jid = uuid.uuid4().hex
    now = time.time()
    JOBS[jid] = {
        "id": jid, "type": jtype, "slug": slug, "status": "running",
        "result": None, "error": None, "created": now, "updated": now,
    }
    # Purge des vieux jobs terminés si on dépasse le plafond.
    if len(JOBS) > JOBS_MAX:
        done = sorted((j for j in JOBS.values() if j["status"] != "running"), key=lambda j: j["updated"])
        for j in done[: len(JOBS) - JOBS_MAX]:
            JOBS.pop(j["id"], None)
    return jid


def _finish(jid: str, status: str, result=None, error=None) -> None:
    j = JOBS.get(jid)
    if j is None:
        return
    j.update(status=status, result=result, error=error, updated=time.time())


def _spawn(coro) -> None:
    t = asyncio.create_task(coro)
    _tasks.add(t)
    t.add_done_callback(_tasks.discard)


# --------------------------------------------------------------------------
# Exécution des scripts
# --------------------------------------------------------------------------
async def _run(cmd: list) -> tuple:
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=OP_TIMEOUT_S)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return 124, "opération interrompue (timeout)"
    return proc.returncode, out.decode("utf-8", "replace")


def _read_env(slug: str) -> dict:
    envp = Path(HERMES_BASE) / slug / ".env"
    d = {}
    try:
        for line in envp.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                d[k] = v
    except Exception:
        pass
    return d


_RE_ROUTE = re.compile(r"Route Traefik\s*:\s*HTTP\s*(\S+)")
_RE_HEALTH = re.compile(r"Agent /health\s*:\s*HTTP\s*(\S+)")
_RE_BASIC = re.compile(r"BasicAuth.*?:\s*(\S+)\s*/\s*(\S+)")


_RE_PII_EGRESS = re.compile(r"Egress ferme\s*:\s*curl=(\S+)")
_RE_PII_PROXY = re.compile(r"Proxy joignable\s*:\s*HTTP\s*(\S+)")
_RE_PII_PROFIL = re.compile(r"Profil selectionne\s*:\s*(\S+)")


def _parse_pii(logtext: str) -> str:
    """État de la pseudonymisation, tel que le script l'a MESURÉ.

    On ne renvoie pas « active » parce qu'on a passé --pii : on le renvoie
    parce que les trois contrôles du script sont verts. Un locataire dont le
    câblage a échoué doit le dire dans l'écran d'admin, pas seulement au fond
    du log — c'est là que ça se verrait à temps.
    Les deux premiers vont par paire : « egress fermé » seul ne distingue pas
    un réseau clos d'un réseau mort.
    """
    if "--- Pseudonymisation" not in logtext:
        return "inactive"
    e = _RE_PII_EGRESS.search(logtext)
    p = _RE_PII_PROXY.search(logtext)
    f = _RE_PII_PROFIL.search(logtext)
    egress = e.group(1) if e else "?"
    proxy = p.group(1) if p else "?"
    profil = f.group(1) if f else "?"
    ok = egress == "7" and proxy == "200" and profil == "1"
    etat = "active" if ok else "INCOMPLÈTE — à vérifier"
    return f"{etat} (egress curl={egress} · proxy {proxy} · profil {profil})"


def _parse_report(logtext: str) -> dict:
    r = {}
    m = _RE_ROUTE.search(logtext)
    if m: r["route_status"] = m.group(1)
    m = _RE_HEALTH.search(logtext)
    if m: r["agent_health"] = m.group(1)
    m = _RE_BASIC.search(logtext)
    if m:
        r["basicauth_user"] = m.group(1)
        r["basicauth_password"] = m.group(2)
    return r


async def _job_provision(jid: str, cmd: list, slug: str) -> None:
    try:
        async with _lock:
            log.info("provision slug=%s (job=%s)", slug, jid)
            rc, out = await _run(cmd)
        if rc != 0:
            _finish(jid, "error", result={"returncode": rc, "log": out}, error="provisionnement échoué")
            log.warning("provision slug=%s ÉCHEC rc=%s", slug, rc)
            return
        env = _read_env(slug)
        report = _parse_report(out)
        _finish(jid, "done", result={
            "slug": slug,
            "url": f"https://{slug}.{DOMAINE_BASE}",
            "webui_password": env.get("HERMES_WEBUI_PASSWORD", ""),
            "basicauth_user": report.get("basicauth_user"),
            "basicauth_password": report.get("basicauth_password"),
            "route_status": report.get("route_status"),
            "agent_health": report.get("agent_health"),
            "pii": _parse_pii(out),
            "log": out,
        })
        log.info("provision slug=%s OK", slug)
    except Exception as e:
        _finish(jid, "error", error=f"exception: {e}")
        log.exception("provision slug=%s exception", slug)


async def _job_deprovision(jid: str, cmd: list, slug: str) -> None:
    try:
        async with _lock:
            log.warning("DEPROVISION slug=%s (job=%s, irréversible)", slug, jid)
            rc, out = await _run(cmd)
        _finish(jid, "done" if rc == 0 else "error",
                result={"returncode": rc, "log": out},
                error=None if rc == 0 else "dé-provisionnement échoué")
    except Exception as e:
        _finish(jid, "error", error=f"exception: {e}")
        log.exception("deprovision slug=%s exception", slug)


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "scripts": {
        "provision": os.path.exists(NOUVEAU_SCRIPT),
        "deprovision": os.path.exists(DESPROV_SCRIPT),
    }, "pending": _pending_count()}


@app.post("/v1/provision")
async def provision(req: ProvisionReq, authorization: Optional[str] = Header(default=None)):
    verify_secret(authorization)
    validate_slug(req.slug)
    name = clean_freetext("name", req.name)
    sector = clean_freetext("sector", req.sector)
    agent_name = clean_freetext("agent_name", req.agent_name)
    pack = clean_freetext("pack", req.pack)
    email = clean_freetext("owner_email", req.owner_email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="owner_email invalide")

    cmd = [NOUVEAU_SCRIPT, req.slug, name, sector, agent_name, f"--owner={email}", f"--pack={pack}"]
    if req.pii:
        cmd.append("--pii")
    cmd.append("--auto")
    jid = _new_job("provision", req.slug)
    _spawn(_job_provision(jid, cmd, req.slug))
    return {"job_id": jid, "status": "running", "slug": req.slug}


@app.post("/v1/deprovision")
async def deprovision(req: DeprovisionReq, authorization: Optional[str] = Header(default=None)):
    verify_secret(authorization)
    validate_slug(req.slug)
    if not req.confirm:
        raise HTTPException(status_code=400, detail="confirmation requise (confirm=true) — irréversible")

    cmd = [DESPROV_SCRIPT, req.slug, "--auto"]
    jid = _new_job("deprovision", req.slug)
    _spawn(_job_deprovision(jid, cmd, req.slug))
    return {"job_id": jid, "status": "running", "slug": req.slug}


@app.get("/v1/jobs/{job_id}")
async def job_status(job_id: str, authorization: Optional[str] = Header(default=None)):
    verify_secret(authorization)
    j = JOBS.get(job_id)
    if j is None:
        raise HTTPException(status_code=404, detail="job inconnu")
    return {
        "id": j["id"], "type": j["type"], "slug": j["slug"],
        "status": j["status"], "result": j["result"], "error": j["error"],
    }