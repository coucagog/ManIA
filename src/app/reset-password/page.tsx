'use client'

import { useActionState, useState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, undefined)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  if (state?.ok) {
    return (
      <>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 400, letterSpacing: '-.01em', marginBottom: '8px' }}>
            Mot de passe mis à jour
          </p>
          <p className="auth-sub">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
        </div>
        <Link href="/login" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '15px 24px' }}>
          Se connecter
        </Link>
      </>
    )
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p className="auth-error">Lien invalide ou manquant. Faites une nouvelle demande.</p>
        <Link href="/forgot-password" className="link-s" style={{ marginTop: '16px', textDecoration: 'none', display: 'block' }}>
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '20px', fontWeight: 400, letterSpacing: '-.01em', marginBottom: '8px' }}>
          Nouveau mot de passe
        </p>
        <p className="auth-sub">Choisissez un mot de passe sécurisé (8 caractères minimum).</p>
      </div>

      <form action={action} className="form-group">
        <input type="hidden" name="token" value={token} />

        <span className="f-label">Nouveau mot de passe</span>
        <div className="f-wrap">
          <input
            className="f-in"
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder="••••••••••••"
            required
            autoFocus
          />
          <button type="button" className="f-eye" onClick={() => setShowPw(p => !p)}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>

        <span className="f-label">Confirmer le mot de passe</span>
        <div className="f-wrap">
          <input
            className="f-in"
            type={showConfirm ? 'text' : 'password'}
            name="confirm"
            placeholder="••••••••••••"
            required
          />
          <button type="button" className="f-eye" onClick={() => setShowConfirm(p => !p)}>
            {showConfirm ? '🙈' : '👁'}
          </button>
        </div>

        {state?.error && <p className="auth-error">{state.error}</p>}

        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>
      </form>

      <Link href="/forgot-password" className="link-s" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        Demander un nouveau lien
      </Link>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo">
          <span className="man">MAN</span><span className="ia">IA</span>
        </div>
        <Suspense fallback={<p className="auth-sub" style={{ textAlign: 'center' }}>Chargement…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
