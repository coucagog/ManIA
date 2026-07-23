// src/app/admin/demandes/page.tsx
//
// Écran de suivi des candidatures. Composant SERVEUR : les données ne
// transitent pas côté client, et requireAdmin() s'applique avant tout rendu.

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  changerStatutDemande,
  enregistrerNote,
  lierLocataire,
  supprimerDemande,
} from '@/app/actions/demandes'

const LIB_SECTEUR: Record<string, string> = {
  ophtalmo: 'Ophtalmologie',
  optique: 'Optique',
  sante: 'Santé',
  autre: 'Autre',
}

const LIB_STATUT: Record<string, string> = {
  nouvelle: 'Nouvelle',
  qualifiee: 'Qualifiée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

function dateFr(d: Date) {
  // Format explicite : évite l'écart serveur/client qui provoque les
  // avertissements d'hydratation.
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(d)
}

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const { statut } = await searchParams
  const filtre = statut && statut !== 'toutes' ? { statut } : {}

  const demandes = await prisma.demandeAgent.findMany({
    where: filtre,
    orderBy: [{ statut: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  const compteurs = await prisma.demandeAgent.groupBy({
    by: ['statut'],
    _count: { _all: true },
  })
  const parStatut = Object.fromEntries(
    compteurs.map(c => [c.statut, c._count._all]),
  ) as Record<string, number>

  return (
    <div className="adm-page">
      <h1 className="adm-title">Candidatures</h1>

      <div className="adm-filtres">
        <a href="/admin/demandes">Toutes</a>
        {['nouvelle', 'qualifiee', 'acceptee', 'refusee'].map(st => (
          <a key={st} href={`/admin/demandes?statut=${st}`}>
            {LIB_STATUT[st]} ({parStatut[st] ?? 0})
          </a>
        ))}
      </div>

      {demandes.length === 0 && (
        <p className="adm-vide">Aucune demande pour ce filtre.</p>
      )}

      {demandes.map(d => (
        <article key={d.id} className={`adm-carte adm-carte--${d.statut}`}>
          <header className="adm-carte-tete">
            <div>
              <strong>{d.nom}</strong>
              {d.organisation && <span className="adm-org"> — {d.organisation}</span>}
              <div className="adm-meta">
                <a href={`mailto:${d.email}`}>{d.email}</a>
                {d.telephone && <> · {d.telephone}</>}
                {' · '}{LIB_SECTEUR[d.secteur] ?? d.secteur}
                {' · '}{dateFr(d.createdAt)}
              </div>
            </div>
            <span className={`adm-badge adm-badge--${d.statut}`}>
              {LIB_STATUT[d.statut] ?? d.statut}
            </span>
          </header>

          <p className="adm-besoin">{d.besoin}</p>

          <p className="adm-consent">
            Consentement enregistré le {dateFr(d.consentement)}
            {d.tenantSlug && <> · locataire <code>{d.tenantSlug}</code></>}
          </p>

          <div className="adm-actions">
            {/* Changement de statut */}
            {['nouvelle', 'qualifiee', 'refusee'].map(st =>
              st === d.statut ? null : (
                <form key={st} action={changerStatutDemande}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="statut" value={st} />
                  <button className="adm-btn" type="submit">
                    → {LIB_STATUT[st]}
                  </button>
                </form>
              ),
            )}

            {/* Note interne */}
            <form action={enregistrerNote} className="adm-note-form">
              <input type="hidden" name="id" value={d.id} />
              <input
                className="adm-input"
                type="text"
                name="noteInterne"
                defaultValue={d.noteInterne ?? ''}
                placeholder="Note interne (jamais montrée au prospect)"
                maxLength={500}
              />
              <button className="adm-btn" type="submit">Noter</button>
            </form>

            {/* Liaison au locataire créé */}
            <form action={lierLocataire} className="adm-note-form">
              <input type="hidden" name="id" value={d.id} />
              <input
                className="adm-input adm-input--court"
                type="text"
                name="tenantSlug"
                defaultValue={d.tenantSlug ?? ''}
                placeholder="slug du locataire"
                pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
              />
              <button className="adm-btn adm-btn--ok" type="submit">
                Lier &amp; accepter
              </button>
            </form>

            {/* ⚠️ Suppression : réservée au SPAM. Une demande légitime se
                marque "Refusée" — garder la trace protège en cas de
                contestation (loi 2008-12, preuve du consentement). */}
            <form action={supprimerDemande}>
              <input type="hidden" name="id" value={d.id} />
              <button className="adm-btn adm-btn--danger" type="submit">
                Supprimer (spam)
              </button>
            </form>
          </div>

          {/* Rappel du parcours : le script n'est PAS lancé depuis le web
              (jamais de docker.sock dans mania-app). */}
          {d.statut === 'qualifiee' && (
            <p className="adm-aide">
              Étape suivante, en SSH sur le VPS :
              <code>
                sudo /opt/hermes/gabarit/nouveau-tenant.sh &lt;slug&gt; &quot;{d.organisation ?? d.nom}&quot; \
                &quot;{LIB_SECTEUR[d.secteur] ?? 'assistance generale'}&quot; &quot;Ridwan&quot; \
                --owner={d.email} --pack={d.secteur}
              </code>
              Créer d&apos;abord le compte utilisateur avec cet e-mail.
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
