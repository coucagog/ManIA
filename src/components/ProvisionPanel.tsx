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
        body: JSON.stringify({ slug, name, sector, ownerEmail, pack }),
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
            Route {result.route_status} · Agent {result.agent_health}. Le client se
            connecte avec son compte mania.sn puis ce mot de passe, et saisit sa clé
            LLM dans l&apos;interface.
          </p>
        </div>
      )}
    </div>
  )
}
