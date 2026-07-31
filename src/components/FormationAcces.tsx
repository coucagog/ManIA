// src/components/FormationAcces.tsx
//
// Bloc « Demander un accès » de la page /formation — VOLONTAIREMENT isolé :
// aujourd'hui c'est une file d'attente (comme /candidature) ; demain ce bloc
// accueillera l'inscription en ligne + le paiement Wave / Orange Money sans
// que le reste de la page ne bouge.
//
// Logique identique à la page candidature : champ-piège, consentement
// obligatoire et horodaté, aucun email envoyé avant validation humaine.
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { creerDemandeFormation } from '@/app/actions/formation'
import { SECTEURS, SECTEUR_DEFAUT } from '@/lib/secteurs'

export default function FormationAcces() {
  const [state, action, pending] = useActionState(creerDemandeFormation, undefined)

  return (
    <section id="acces" className="fp-acces">
      <div className="fp-acces-card">
        {/* ── Volet argumentaire ── */}
        <div>
          <p className="land-eyebrow">Accès à la plateforme</p>
          <h2 className="fp-acces-h2">Demandez un accès pour votre équipe</h2>
          <p className="fp-acces-p">
            L&apos;accès aux cours n&apos;est pas en libre-service : vous nous adressez
            une courte demande, traitée par un humain sous quelques jours.
          </p>
          <ul className="fp-args">
            <li><span className="dot" aria-hidden="true" />Accès à l&apos;intégralité du catalogue, cours gratuits et payants.</li>
            <li><span className="dot" aria-hidden="true" />Des comptes créés pour chaque membre de votre équipe.</li>
            <li><span className="dot" aria-hidden="true" />Un accompagnement humain, du choix des parcours au suivi.</li>
          </ul>
        </div>

        {/* ── Formulaire ou confirmation ── */}
        {state?.ok ? (
          <div className="fp-confirm">
            <div className="fp-confirm-ico" aria-hidden="true">✓</div>
            <h3>Demande enregistrée</h3>
            <p>
              Merci. Nous revenons vers vous par e-mail sous quelques jours
              pour ouvrir les accès de votre équipe.
            </p>
          </div>
        ) : (
          <div>
            <form action={action} className="form-group">
              {/* Champ-piège : invisible pour un humain, rempli par les robots */}
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

              <span className="f-label">Organisation</span>
              <input className="f-in" type="text" name="organisation" maxLength={160}
                     placeholder="Cabinet, ONG, agence, atelier…" />

              <span className="f-label">Secteur d&apos;activité *</span>
              <select className="f-in" name="secteur" defaultValue={SECTEUR_DEFAUT} required>
                {SECTEURS.map(s => (
                  <option key={s.slug} value={s.slug}>{s.long}</option>
                ))}
              </select>

              <span className="f-label">Votre besoin de formation *</span>
              <textarea className="f-in" name="besoin" required rows={4} maxLength={4000}
                        placeholder="Combien de personnes à former ? Sur quels usages : rédaction, analyse, agents, sécurité… ?" />

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

            <p className="auth-sub" style={{ marginTop: 16 }}>
              Déjà inscrit ? <Link href="/login">Accéder à mon espace</Link>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
