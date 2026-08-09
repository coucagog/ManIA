"""
Service de transcription partagé MANIA — faster-whisper (small, INT8).

Règles non négociables (STACK.md §6, STACK-3.md §36) :
  - File d'attente / pool borné, pas de parallélisme libre.
  - Éphémère : rien n'est stocké ni loggué en clair (ni l'audio, ni le texte).
  - Token par tenant, dérivé : HMAC-SHA256(SHARED_SERVICES_SECRET, slug),
    présenté au format "Authorization: Bearer <slug>.<hmac_hex>".
    Aucune table de correspondance à tenir à jour à chaque provisioning.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import io
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

# --------------------------------------------------------------------------
# Configuration — tout par variable d'environnement, rien en dur.
# --------------------------------------------------------------------------
MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
# "Accessible par concurrence à tous les agents" = tous les agents peuvent
# SOUMETTRE en même temps ; le service les traite via une FILE D'ATTENTE bornée
# (STACK.md §6 : "file d'attente, pas de parallélisme libre" — sur peu de cœurs,
# N jobs en vrai parallèle se battent pour le CPU et finissent tous plus lentement).
#   - WORKERS=1 x CPU_THREADS=2 : un job à la fois, mais rapide (2 threads),
#     ce qui rend la main vite au 1er demandeur. Les autres patientent en file.
#   - Les messages vocaux Telegram sont courts (<1 min) -> attente négligeable.
#   - Pour autoriser un vrai parallélisme (WORKERS=2), il faut passer num_workers
#     au modèle (thread-safety des .transcribe() simultanés) ET revérifier la RAM
#     (risque de réplication des poids). À faire plus tard, mesures à l'appui.
# Contrainte : WORKERS x CPU_THREADS <= `cpus` du compose (ici 2).
WORKERS = int(os.environ.get("WHISPER_WORKERS", "1"))
CPU_THREADS = int(os.environ.get("WHISPER_CPU_THREADS", "2"))
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "100"))
REQUEST_TIMEOUT_S = int(os.environ.get("REQUEST_TIMEOUT_S", "300"))
SHARED_SERVICES_SECRET = os.environ.get("SHARED_SERVICES_SECRET", "")

# --------------------------------------------------------------------------
# Logging — JAMAIS le contenu audio ni le texte transcrit. Uniquement des
# métadonnées : tenant, durée de traitement, taille, succès/échec.
# --------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("mania-transcription")

_model: Optional[WhisperModel] = None
_executor: Optional[ThreadPoolExecutor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _executor
    if not SHARED_SERVICES_SECRET:
        raise RuntimeError(
            "SHARED_SERVICES_SECRET manquant — refus de démarrer sans lui "
            "(aucune vérification de token ne serait possible)."
        )
    log.info(
        "Chargement faster-whisper '%s' (%s, %d thread(s) CPU/job, %d worker(s))…",
        MODEL_SIZE, COMPUTE_TYPE, CPU_THREADS, WORKERS,
    )
    _model = WhisperModel(
        MODEL_SIZE, device="cpu", compute_type=COMPUTE_TYPE, cpu_threads=CPU_THREADS
    )
    # Le pool de threads EST la file d'attente : au-delà de WORKERS jobs en
    # simultané, les requêtes suivantes patientent — pas de parallélisme libre.
    _executor = ThreadPoolExecutor(max_workers=WORKERS)
    log.info("Modèle chargé, service prêt.")
    yield
    _executor.shutdown(wait=False)


app = FastAPI(
    title="mania-transcription",
    lifespan=lifespan,
    # API interne token-par-tenant, pas un service public à documenter.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


# --------------------------------------------------------------------------
# Auth — token dérivé, pas de table à synchroniser (STACK-3.md §36).
# --------------------------------------------------------------------------
def verify_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization Bearer manquant")
    token = authorization[len("Bearer "):].strip()
    if "." not in token:
        raise HTTPException(status_code=401, detail="Token malformé")
    slug, _, presented_hex = token.rpartition(".")
    if not slug or not presented_hex:
        raise HTTPException(status_code=401, detail="Token malformé")
    expected_hex = hmac.new(
        SHARED_SERVICES_SECRET.encode("utf-8"), slug.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_hex, presented_hex):
        raise HTTPException(status_code=401, detail="Token invalide")
    return slug


# --------------------------------------------------------------------------
# Santé — pas d'auth requise, aucune donnée sensible exposée.
# --------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "compute_type": COMPUTE_TYPE,
        "workers": WORKERS,
    }


# --------------------------------------------------------------------------
# Transcription — synchrone : l'agent appelle, attend, reçoit le résultat.
# --------------------------------------------------------------------------
def _run_transcription(raw_bytes: bytes) -> tuple[str, str]:
    """Exécuté dans le pool — jamais plus de WORKERS appels en simultané."""
    assert _model is not None
    segments, info = _model.transcribe(io.BytesIO(raw_bytes), beam_size=5)
    text = "".join(segment.text for segment in segments).strip()
    return text, info.language


@app.post("/v1/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
):
    tenant = verify_token(authorization)

    raw = await file.read()
    size_mb = len(raw) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({size_mb:.1f} Mo > {MAX_UPLOAD_MB} Mo)",
        )

    loop = asyncio.get_running_loop()
    started = time.monotonic()
    try:
        future = loop.run_in_executor(_executor, _run_transcription, raw)
        text, language = await asyncio.wait_for(future, timeout=REQUEST_TIMEOUT_S)
    except asyncio.TimeoutError:
        log.warning("tenant=%s timeout après %ds", tenant, REQUEST_TIMEOUT_S)
        raise HTTPException(status_code=504, detail="Délai de transcription dépassé")
    except HTTPException:
        raise
    except Exception:
        log.exception("tenant=%s échec de transcription", tenant)
        raise HTTPException(status_code=500, detail="Échec de la transcription")
    finally:
        # Rien n'est écrit sur disque ; le buffer ne survit pas à la requête.
        del raw

    elapsed = time.monotonic() - started
    log.info("tenant=%s transcription ok en %.1fs (%.1f Mo)", tenant, elapsed, size_mb)
    return JSONResponse({"text": text, "language": language})
