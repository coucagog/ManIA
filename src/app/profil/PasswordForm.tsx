'use client'

import { useActionState } from 'react'
import { changePassword } from '@/app/actions/account'

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <div className="f-label" style={{ marginBottom: '6px' }}>Mot de passe actuel</div>
        <input className="f-in" type="password" name="current" autoComplete="current-password" required />
      </div>
      <div>
        <div className="f-label" style={{ marginBottom: '6px' }}>Nouveau mot de passe</div>
        <input className="f-in" type="password" name="new" autoComplete="new-password" required minLength={8} />
      </div>
      <div>
        <div className="f-label" style={{ marginBottom: '6px' }}>Confirmer</div>
        <input className="f-in" type="password" name="confirm" autoComplete="new-password" required minLength={8} />
      </div>

      {state?.error && <p className="auth-error">{state.error}</p>}
      {state?.ok && <p style={{ color: 'var(--accent, var(--coral))', fontSize: '13px' }}>✓ Mot de passe mis à jour.</p>}

      <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: '4px' }}>
        {pending ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </form>
  )
}
