'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo">
          <span className="man">MAN</span><span className="ia">IA</span>
        </div>
        <p className="auth-sub">Espace réservé aux apprenants.</p>

        <form action={action} className="form-group">
          <span className="f-label">Adresse e-mail</span>
          <input
            className="f-in"
            type="email"
            name="email"
            placeholder="prenom.nom@institution.fr"
            required
          />
          <span className="f-label">Mot de passe</span>
          <div className="f-wrap">
            <input
              className="f-in"
              type={showPw ? 'text' : 'password'}
              name="password"
              placeholder="••••••••••••"
              required
            />
            <button type="button" className="f-eye" onClick={() => setShowPw(p => !p)}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {state?.error && <p className="auth-error">{state.error}</p>}

          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <Link href="/forgot-password" className="link-s" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
          Mot de passe oublié ?
        </Link>
        <p className="auth-note">
          Authentification à deux facteurs activée par défaut.<br /><br />
          L&apos;accès à MANIA se fait sur candidature.{' '}
          <span style={{ color: 'var(--coral)', cursor: 'pointer' }}>En savoir plus →</span>
        </p>
      </div>
    </div>
  )
}
