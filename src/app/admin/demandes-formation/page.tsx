// src/app/admin/demandes-formation/page.tsx
//
// Suivi des demandes d'accès à la formation. Composant SERVEUR, calqué sur
// /admin/demandes (candidatures agent). Pas de liaison locataire ici : la
// suite d'une demande acceptée est la création des comptes apprenants
// (/admin/users/new), rappelée sur les demandes qualifiées.

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  changerStatutDemandeFormation,
  noterDemandeFormation,
  supprimerDemandeFormation,
} from '@/app/actions/formation'
import { LIB_SECTEUR } from '@/lib/secteurs'
import Link from 'next/link'

const LIB_STATUT: Record<string, string> = {
  nouvelle: 'Nouvelle',
  qualifiee: 'Qualifiée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

function dateFr(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(d)
}

export default async function AdminDemandesFormationPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const { statut } = await searchParams
  const filtre = statut && statut !== 'toutes' ? { statut } : {}

  const demandes = await prisma.demandeFormation.findMany({
    where: filtre,
    orderBy: [{ statut: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  const compteurs = await prisma.demandeFormation.groupBy({
    by: ['statut'],
    _count: { _all: true },
  })
  const parStatut = Object.fromEntries(
    compteurs.map(c => [c.statut, c._count._all]),
  ) as Record<string, number>
  const total = Object.values(parStatut).reduce((a, b) => a + b, 0)

  return (
    <div className="adm-page">
      <h1 className="adm-title">Demandes de formation</h1>

      {/* Tuiles de statistiques — cliquables, chacune filtre la liste */}
      <div className="adm-stats">
        {['nouvelle', 'qualifiee', 'acceptee', 'refusee'].map(st => (
          <a
            key={st}
            href={`/admin/demandes-formation?statut=${st}`}
            className={`adm-tuile adm-tuile--${st}${statut === st ? ' is-active' : ''}`}
          >
            <div className="adm-tuile-num">{parStatut[st] ?? 0}</div>
            <div className="adm-tuile-lbl">
              <span className="adm-tuile-dot" aria-hidden="true" />
              {LIB_STATUT[st]}
            </div>
          </a>
        ))}
      </div>

      <div className="adm-filtres">
        <a
          href="/admin/demandes-formation"
          className={!statut || statut === 'toutes' ? 'is-active' : ''}
        >
          Toutes ({total})
        </a>
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
          </p>

          <div className="adm-actions">
            {/* Changement de statut */}
            {['nouvelle', 'qualifiee', 'acceptee', 'refusee'].map(st =>
              st === d.statut ? null : (
                <form key={st} action={changerStatutDemandeFormation}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="statut" value={st} />
                  <button
                    className={`adm-btn${st === 'acceptee' ? ' adm-btn--ok' : ''}`}
                    type="submit"
                  >
                    → {LIB_STATUT[st]}
                  </button>
                </form>
              ),
            )}

            {/* Note interne */}
            <form action={noterDemandeFormation} className="adm-note-form">
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

            {/* ⚠️ Suppression : réservée au SPAM (cf. loi 2008-12, trace du
                consentement). Une demande légitime se marque "Refusée". */}
            <form action={supprimerDemandeFormation}>
              <input type="hidden" name="id" value={d.id} />
              <button className="adm-btn adm-btn--danger" type="submit">
                Supprimer (spam)
              </button>
            </form>
          </div>

          {/* Rappel du parcours : les comptes se créent depuis l'admin
              (pas d'inscription publique sur la plateforme). */}
          {d.statut === 'qualifiee' && (
            <p className="adm-aide">
              Étape suivante : créer le ou les comptes apprenants dans{' '}
              <Link href="/admin/users/new">Utilisateurs → Nouveau</Link> avec
              l&apos;e-mail du demandeur, puis marquer la demande « Acceptée ».
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
