// src/app/(public)/candidature/page.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { creerDemande } from '@/app/actions/demandes'
import { SECTEURS, SECTEUR_DEFAUT } from '@/lib/secteurs'

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
    <div className="cand-page">
      <p className="cand-eyebrow">Agents IA · Demande</p>
      <h1 className="cand-h1">Demander un agent IA pour votre activité</h1>

      <div className="cand-grid">
        {/* ── Volet rassurant ── */}
        <aside className="cand-aside">
          <div className="cand-reassure">
            <span className="cand-reassure-ico cand-reassure-ico--coral" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div>
              <h2>Un agent configuré pour VOTRE métier</h2>
              <p>Commerce, droit, santé, restauration ou tout autre secteur : chaque agent est paramétré sur vos usages réels.</p>
            </div>
          </div>

          <div className="cand-reassure">
            <span className="cand-reassure-ico cand-reassure-ico--fg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M12 3 4 6.5v5c0 4.4 3.1 7.7 8 9 4.9-1.3 8-4.6 8-9v-5L12 3Z" />
              </svg>
            </span>
            <div>
              <h2>Vos données restent au Sénégal</h2>
              <p>Traitement conforme à la loi n°2008-12. Ni revente, ni transmission à des tiers.</p>
            </div>
          </div>

          <div className="cand-reassure">
            <span className="cand-reassure-ico cand-reassure-ico--fg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div>
              <h2>Mise en service accompagnée</h2>
              <p>Pas de libre-service : nous configurons et déployons l&apos;agent avec vous.</p>
            </div>
          </div>
        </aside>

        {/* ── Formulaire — logique strictement inchangée ── */}
        <div className="cand-form-card">
          <form action={action} className="form-group">
            {/* ── Champ-piège : invisible pour un humain, rempli par les robots ── */}
            <input
              type="text" name="site" tabIndex={-1} autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
            />

            <span className="f-label">Nom et prénom *</span>
            <input className="f-in" type="text" name="nom" required maxLength={120}
                   placeholder="Aïssatou Ndiaye" />

            <span className="f-label">Adresse e-mail *</span>
            <input className="f-in" type="email" name="email" required
                   placeholder="vous@entreprise.sn" />

            <span className="f-label">Téléphone</span>
            <input className="f-in" type="tel" name="telephone"
                   placeholder="+221 77 000 00 00" />

            <span className="f-label">Cabinet / organisation</span>
            <input className="f-in" type="text" name="organisation" maxLength={160}
                   placeholder="Cabinet, ONG, agence, atelier…" />

            <span className="f-label">Secteur d&apos;activité *</span>
            <select className="f-in" name="secteur" defaultValue={SECTEUR_DEFAUT} required>
              {SECTEURS.map(s => (
                <option key={s.slug} value={s.slug}>{s.long}</option>
              ))}
            </select>

            <span className="f-label">Votre besoin *</span>
            <textarea className="f-in" name="besoin" required rows={5} maxLength={4000}
                      placeholder="Quelles tâches souhaitez-vous déléguer ? Réponses aux clients, rendez-vous, devis, courriers, suivi de dossiers…" />

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
    </div>
  )
}