'use client'

// src/components/DeprovisionButton.tsx
//
// Suppression IRRÉVERSIBLE d'un locataire. La confirmation "retape le slug"
// (qui vivait dans le terminal) est ici, dans l'UI. Le démon impose en plus
// confirm=true, et la route vérifie que le slug retapé correspond.

import { useState } from 'react'

type Phase = 'idle' | 'confirming' | 'running' | 'done' | 'error'

export function DeprovisionButton({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setPhase('running')
    setError(null)
    try {
      const r = await fetch('/api/admin/deprovision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, confirmSlug: typed }),
      })
      const j = await r.json()
      if (!r.ok || !j.job_id) {
        setPhase('error')
        setError(j.error || j.detail || 'échec du démarrage')
        return
      }
      // Sondage (~40 * 3 s = 2 min de marge).
      for (let i = 0; i < 40; i++) {
        await new Promise((res) => setTimeout(res, 3000))
        const rr = await fetch(`/api/admin/jobs/${j.job_id}`)
        const jj = await rr.json()
        if (jj.status === 'done') {
          setPhase('done')
          return
        }
        if (jj.status === 'error') {
          setPhase('error')
          setError(jj.error || 'dé-provisionnement échoué')
          return
        }
      }
      setPhase('error')
      setError('délai dépassé — vérifier la liste des locataires.')
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : 'erreur réseau')
    }
  }

  if (phase === 'done') {
    return <span className="adm-aide">🗑️ Locataire « {slug} » supprimé.</span>
  }

  if (phase === 'idle') {
    return (
      <button
        className="adm-btn adm-btn--danger"
        type="button"
        onClick={() => setPhase('confirming')}
      >
        Supprimer le locataire
      </button>
    )
  }

  return (
    <div className="adm-confirm">
      <span>
        Suppression <strong>IRRÉVERSIBLE</strong>. Retape <code>{slug}</code> pour
        confirmer :
      </span>
      <input
        className="adm-input adm-input--court"
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value.toLowerCase())}
        placeholder={slug}
        disabled={phase === 'running'}
      />
      <button
        className="adm-btn adm-btn--danger"
        type="button"
        disabled={typed !== slug || phase === 'running'}
        onClick={run}
      >
        {phase === 'running' ? 'Suppression…' : 'Confirmer la suppression'}
      </button>
      <button
        className="adm-btn"
        type="button"
        disabled={phase === 'running'}
        onClick={() => {
          setPhase('idle')
          setTyped('')
          setError(null)
        }}
      >
        Annuler
      </button>
      {phase === 'error' && (
        <p className="adm-err" role="alert">
          Échec : {error}
        </p>
      )}
    </div>
  )
}
