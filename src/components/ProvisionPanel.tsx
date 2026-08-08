'use client'

// src/components/ProvisionPanel.tsx
//
// Bouton "Provisionner" + suivi asynchrone. Démarre le job côté serveur puis
// SONDE l'état toutes les 3 s (chaque requête est courte -> pas de timeout
// Traefik). À l'issue, affiche l'URL et le mot de passe WebUI à transmettre.

import { useRef, useState } from 'react'

type Phase = 'idle' | 'running' | 'done' | 'error'

type Result = {
  url?: string
  webui_password?: string
  basicauth_user?: string
  basicauth_password?: string
  route_status?: string
  agent_health?: string
  // Rempli par le démon quand il saura le remonter. Affiché seulement s'il est
  // là : mieux vaut ne rien dire que d'affirmer un état qu'on n'a pas mesuré.
  pii?: string
}

export function ProvisionPanel({
  defaultSlug,
  name,
  sector,
  ownerEmail,
  pack,
}: {
  defaultSlug?: string
  name: string
  sector?: string
  ownerEmail: string
  pack?: string
}) {
  const [slug, setSlug] = useState(defaultSlug ?? '')
  // Décoché par défaut, et c'est volontaire : la case FORCE, elle ne reflète
  // pas l'état. Le secteur déclaré peut déjà exiger la pseudonymisation — cette
  // case ne sait pas le dire (la déclaration vit dans gabarit/packs/ sur le
  // VPS) et ne peut de toute façon jamais l'éteindre.
  const [forcerPii, setForcerPii] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  async function start() {
    setError(null)
    setResult(null)
    setPhase('running')
    cancelled.current = false
    try {
      const r = await fetch('/api/admin/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, sector, ownerEmail, pack, pii: forcerPii }),
      })
      const j = await r.json()
      if (!r.ok || !j.job_id) {
        setPhase('error')
        setError(j.error || j.detail || 'échec du démarrage')
        return
      }
      poll(j.job_id)
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : 'erreur réseau')
    }
  }

  async function poll(jobId: string) {
    // ~60 tentatives * 3 s = 3 min de marge (le provisioning dure ~1 min).
    for (let i = 0; i < 60; i++) {
      await new Promise((res) => setTimeout(res, 3000))
      if (cancelled.current) return
      try {
        const r = await fetch(`/api/admin/jobs/${jobId}`)
        const j = await r.json()
        if (j.status === 'done') {
          setResult(j.result ?? {})
          setPhase('done')
          return
        }
        if (j.status === 'error') {
          setPhase('error')
          setError(j.error || 'provisionnement échoué')
          return
        }
        // status === 'running' -> on continue à sonder
      } catch {
        // erreur transitoire de sondage : on réessaie
      }
    }
    setPhase('error')
    setError('délai dépassé — le locataire a peut-être été créé, vérifier la liste.')
  }

  return (
    <div className="adm-provision">
      <input
        className="adm-input adm-input--court"
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase())}
        placeholder="slug du locataire"
        pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
        disabled={phase === 'running'}
      />
      <button
        className="adm-btn adm-btn--ok"
        type="button"
        onClick={start}
        disabled={phase === 'running' || !slug}
      >
        {phase === 'running' ? 'Provisionnement…' : 'Provisionner'}
      </button>

      <label className="adm-pii">
        <input
          type="checkbox"
          checked={forcerPii}
          onChange={(e) => setForcerPii(e.target.checked)}
          disabled={phase === 'running'}
        />
        <span>
          Forcer la pseudonymisation
          <em>
            Sans effet si le secteur déclaré l&apos;exige déjà — cette case ne peut
            que l&apos;imposer, jamais la retirer. Le locataire perd alors tout accès
            direct à l&apos;extérieur : latence plus élevée, et seuls les modèles
            servis par le proxy restent joignables.
          </em>
        </span>
      </label>

      {phase === 'running' && (
        <span className="adm-aide">
          Création en cours (~1 min). Ne ferme pas la page.
        </span>
      )}

      {phase === 'error' && (
        <p className="adm-err" role="alert">
          Échec : {error}
        </p>
      )}

      {phase === 'done' && result && (
        <div className="adm-ok-box">
          <p>
            ✅ Locataire créé —{' '}
            <a href={result.url} target="_blank" rel="noreferrer">
              {result.url}
            </a>
          </p>
          <p>
            Mot de passe WebUI (à transmettre au client) :{' '}
            <code>{result.webui_password}</code>
          </p>
          <p className="adm-aide">
            Route {result.route_status} · Agent {result.agent_health}
            {result.pii && <> · Pseudonymisation {result.pii}</>}. Le client se
            connecte avec son compte mania.sn puis ce mot de passe, et saisit sa clé
            LLM dans l&apos;interface.
          </p>
        </div>
      )}
    </div>
  )
}
