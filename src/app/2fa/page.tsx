'use client'

import { useActionState, useRef } from 'react'
import { verify2fa, resend2fa } from '@/app/actions/auth'

export default function TwoFAPage() {
  const [state, action, pending] = useActionState(verify2fa, undefined)
  const [resendState, resendAction, resendPending] = useActionState(resend2fa, undefined)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function handleInput(i: number) {
    const val = inputs.current[i]?.value
    if (val && i < 5) inputs.current[i + 1]?.focus()
    if (!val && i > 0) inputs.current[i - 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !inputs.current[i]?.value && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  // Show hint from either verify (wrong code) or resend (new code)
  const devCode = state?.code ?? resendState?.code

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo">
          <span className="man">MAN</span><span className="ia">IA</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 400, letterSpacing: '-.01em' }}>
            Authentification à deux facteurs
          </p>
          <p className="auth-sub">Code à 6 chiffres envoyé à votre adresse institutionnelle.</p>
        </div>

        {devCode && (
          <div className="twofa-hint">
            Code (dev uniquement) : <strong>{devCode}</strong>
          </div>
        )}

        <form action={action}>
          <div className="twofa-row">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el }}
                className="d-in"
                type="text"
                inputMode="numeric"
                maxLength={1}
                name={`d${i}`}
                onInput={() => handleInput(i)}
                onKeyDown={e => handleKeyDown(i, e)}
              />
            ))}
          </div>

          {state?.error && <p className="auth-error" style={{ marginTop: '12px' }}>{state.error}</p>}

          <button className="btn-primary" type="submit" disabled={pending} style={{ marginTop: '16px' }}>
            {pending ? 'Vérification…' : 'Confirmer'}
          </button>
        </form>

        <form action={resendAction} style={{ textAlign: 'center' }}>
          <button type="submit" className="link-s" disabled={resendPending}>
            {resendPending ? 'Envoi…' : resendState?.ok ? '✓ Code renvoyé' : 'Renvoyer le code'}
          </button>
        </form>

        {resendState?.error && (
          <p className="auth-error" style={{ textAlign: 'center' }}>{resendState.error}</p>
        )}

        <p className="auth-note">Authentification confirmée via application MANIA.</p>
      </div>
    </div>
  )
}
