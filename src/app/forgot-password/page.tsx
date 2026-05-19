'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/actions/auth'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo">
          <span className="man">MAN</span><span className="ia">IA</span>
        </div>

        {state?.ok ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 400, letterSpacing: '-.01em', marginBottom: '8px' }}>
                Email envoyé
              </p>
              <p className="auth-sub">
                Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation dans quelques instants.
              </p>
            </div>
            <Link href="/login" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '15px 24px' }}>
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 400, letterSpacing: '-.01em', marginBottom: '8px' }}>
                Mot de passe oublié
              </p>
              <p className="auth-sub">
                Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <form action={action} className="form-group">
              <span className="f-label">Adresse e-mail</span>
              <input
                className="f-in"
                type="email"
                name="email"
                placeholder="prenom.nom@institution.fr"
                required
                autoFocus
              />

              {state?.error && <p className="auth-error">{state.error}</p>}

              <button className="btn-primary" type="submit" disabled={pending}>
                {pending ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>

            <Link href="/login" className="link-s" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              ← Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
