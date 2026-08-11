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
import { LIB_SECTEUR } from '@/lib/secteurs'
import { LIB_OFFRE, offreASignaler } from '@/lib/offres'
import { ProvisionPanel } from '@/components/ProvisionPanel'
import { DeprovisionButton } from '@/components/DeprovisionButton'
import AdminSidebar from '@/components/AdminSidebar'


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

  // Initiales de l'admin : la barre latérale les affiche (même patron que les
  // autres écrans admin, ex. admin/users/page.tsx).
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

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
  const total = Object.values(parStatut).reduce((a, b) => a + b, 0)

  return (
    <div className="app-shell">
      <AdminSidebar active="demandes" initials={admin.initials} />
      <div className="main">
        <div className="adm-page">
          <h1 className="adm-title">Candidatures</h1>

          {/* Tuiles de statistiques — cliquables, chacune filtre la liste */}
          <div className="adm-stats">
            {['nouvelle', 'qualifiee', 'acceptee', 'refusee'].map(st => (
              <a
                key={st}
                href={`/admin/demandes?statut=${st}`}
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
              href="/admin/demandes"
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
                    {' · '}{d.offre ? (LIB_OFFRE[d.offre] ?? d.offre) : 'offre non choisie'}
                    {' · '}{dateFr(d.createdAt)}
                  </div>
                </div>
                <span className={`adm-badge adm-badge--${d.statut}`}>
                  {LIB_STATUT[d.statut] ?? d.statut}
                </span>
              </header>

              {/* 🔴 Métier à secret professionnel sur un palier hébergé : la
                  candidature est acceptée mais demande un rappel avant tout
                  provisionnement (décision d'exclusion, STACK-5 §50). */}
              {offreASignaler(d.secteur, d.offre) && (
                <p className="adm-alerte-sp">
                  Secteur à secret professionnel sur une offre hébergée — rappeler avant
                  provisionnement. Seule la stack locale est ouverte à ce métier.
                </p>
              )}

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
              {/* Provisioning en un clic (via le démon, hors docker.sock). */}
              {d.statut === 'qualifiee' && (
                <div className="adm-aide">
                  <p>
                    Provisionner le locataire — <strong>créer d&apos;abord le compte
                    utilisateur</strong> avec l&apos;e-mail <code>{d.email}</code> :
                  </p>
                  <ProvisionPanel
                    defaultSlug={d.tenantSlug ?? ''}
                    name={d.organisation ?? d.nom}
                    sector={LIB_SECTEUR[d.secteur] ?? 'assistance generale'}
                    ownerEmail={d.email}
                    pack={d.secteur}
                  />
                </div>
              )}

              {/* Locataire déjà lié : suppression possible (irréversible). */}
              {d.tenantSlug && (
                <div className="adm-aide">
                  <DeprovisionButton slug={d.tenantSlug} />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
