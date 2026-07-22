// src/app/(public)/candidature/page.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { creerDemande } from '@/app/actions/demandes'

export default function CandidaturePage() {
  const [state, action, pending] = useActionState(creerDemande, undefined)

  if (state?.ok) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="logo"><span className="man">MAN</span><span className="ia">IA</span></div>
          <p className="auth-sub">Demande enregistrée.</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 16 }}>
            Merci. Nous étudions votre demande et revenons vers vous par e-mail.
            Chaque agent est configuré pour un métier précis : cette étape
            n&apos;est pas automatique, elle prend quelques jours.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link href="/">Retour à l&apos;accueil</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--large">
        <div className="logo"><span className="man">MAN</span><span className="ia">IA</span></div>
        <p className="auth-sub">Demander un agent IA pour votre activité.</p>

        <form action={action} className="form-group">
          {/* ── Champ-piège : invisible pour un humain, rempli par les robots ── */}
          <input
            type="text" name="site" tabIndex={-1} autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
          />

          <span className="f-label">Nom et prénom *</span>
          <input className="f-in" type="text" name="nom" required maxLength={120}
                 placeholder="Dr Aminata Diop" />

          <span className="f-label">Adresse e-mail *</span>
          <input className="f-in" type="email" name="email" required
                 placeholder="prenom.nom@cabinet.sn" />

          <span className="f-label">Téléphone</span>
          <input className="f-in" type="tel" name="telephone"
                 placeholder="+221 …" />

          <span className="f-label">Cabinet / organisation</span>
          <input className="f-in" type="text" name="organisation" maxLength={160}
                 placeholder="Cabinet d'ophtalmologie …" />

          <span className="f-label">Secteur d&apos;activité *</span>
          <select className="f-in" name="secteur" defaultValue="autre" required>
            <option value="ophtalmo">Ophtalmologie</option>
            <option value="optique">Optique</option>
            <option value="sante">Autre profession de santé</option>
            <option value="autre">Autre secteur</option>
          </select>

          <span className="f-label">Votre besoin *</span>
          <textarea className="f-in" name="besoin" required rows={5} maxLength={4000}
                    placeholder="Quelles tâches souhaitez-vous déléguer ? Comptes rendus, rendez-vous, courriers, suivi de dossiers…" />

          {/* ── Consentement : OBLIGATOIRE, sa date est enregistrée (loi 2008-12) ── */}
          <label className="pub-consent">
            <input type="checkbox" name="consentement" value="1" required />
            <span>
              J&apos;accepte que ces informations soient utilisées pour traiter ma
              demande. Elles ne sont ni revendues ni transmises à des tiers.{' '}
              <Link href="/confidentialite">Politique de confidentialité</Link>.
            </span>
          </label>

          {state?.error && <p className="auth-error">{state.error}</p>}

          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? 'Envoi…' : 'Envoyer ma demande'}
          </button>
        </form>

        <p className="auth-sub" style={{ marginTop: 18 }}>
          Déjà client ? <Link href="/login">Accéder à mon espace</Link>
        </p>
      </div>
    </div>
  )
}
