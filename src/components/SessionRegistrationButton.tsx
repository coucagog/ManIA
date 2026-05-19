'use client'

import { useActionState } from 'react'
import { registerForSession, unregisterFromSession } from '@/app/actions/sessions'

type Props = {
  sessionId: string
  isRegistered: boolean
  isFull: boolean
}

export default function SessionRegistrationButton({ sessionId, isRegistered, isFull }: Props) {
  const [regState, regAction, regPending] = useActionState(registerForSession, undefined)
  const [unregState, unregAction, unregPending] = useActionState(unregisterFromSession, undefined)

  const error = regState?.error ?? unregState?.error
  const pending = regPending || unregPending

  if (isRegistered) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#4caf50', fontWeight: 500 }}>✓ Inscrit</span>
          <form action={unregAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              disabled={pending}
              style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              {pending ? '…' : 'Se désinscrire'}
            </button>
          </form>
        </div>
        {error && <p style={{ fontSize: '11px', color: '#e05c5c' }}>{error}</p>}
      </div>
    )
  }

  if (isFull) {
    return (
      <span style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--inset)', borderRadius: '6px', padding: '6px 14px', display: 'inline-block' }}>
        Complet
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <form action={regAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
          style={{ padding: '8px 20px', fontSize: '13px', width: 'auto' }}
        >
          {pending ? 'Inscription…' : 'S\'inscrire'}
        </button>
      </form>
      {error && <p style={{ fontSize: '11px', color: '#e05c5c' }}>{error}</p>}
    </div>
  )
}
