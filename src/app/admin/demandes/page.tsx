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
} from '@/app/actions/demandes'
import { LIB_SECTEUR } from '@/lib/secteurs'
import { LIB_OFFRE, signalementSecretPro } from '@/lib/offres'
import { ProvisionPanel } from '@/components/ProvisionPanel'
import { DeprovisionButton } from '@/components/DeprovisionButton'
import { SupprimerDemandeButton } from '@/components/SupprimerDemandeButton'
import AdminSidebar from '@/components/AdminSidebar'


const LIB_STATUT: Record<string, string> = {
  nouvelle: 'Nouvelle',
  qualifiee: 'Qualifiée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

/** Rétention annoncée sur /confidentialite : « Candidatures non retenues : 12 mois ». */
const RETENTION_JOURS = 365

/**
 * Âge en jours. Calculé côté SERVEUR uniquement (cette page est un composant
 * serveur) : `Date.now()` n'y provoque pas d'écart d'hydratation.
 * ⚠️ §55.4 — ceci ne fait qu'AFFICHER l'âge. Aucune purge automatique n'existe
 *    encore : la promesse des 12 mois reste tenue à la main.
 */
function ageJours(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
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

  // 🔴 `tenantSlug` est une CHAÎNE que le dé-provisionnement ne nettoie pas :
  //    une fiche continue d'afficher son locataire longtemps après la mort du
  //    conteneur. Se fier à cette chaîne, c'est proposer de dé-provisionner ce
  //    qui n'existe plus — le défaut exact corrigé côté serveur en `d742de9`.
  //    On confronte donc à la table `Tenant`, seule source de vérité.
  //    Une requête pour toute la page : le parc tient en quelques lignes (§16).
  const slugsActifs = new Set(
    (await prisma.tenant.findMany({ select: { slug: true } })).map(t => t.slug),
  )

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

          {demandes.map(d => {
            const motif = signalementSecretPro(d.secteur, d.offre)
            const age = ageJours(d.createdAt)
            // « Non retenue » = refusée : c'est la catégorie que /confidentialite
            // promet de purger au bout de 12 mois.
            const aPurger = d.statut === 'refusee' && age > RETENTION_JOURS
            const locataireActif = !!d.tenantSlug && slugsActifs.has(d.tenantSlug)
            return (
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

              {/* 🔴 Métier à secret professionnel : la candidature est acceptée
                  mais demande un rappel avant tout provisionnement (décision
                  d'exclusion, STACK-5 §50). Deux cas distincts depuis le §55.3 —
                  l'absence de palier choisi est celui qui a le PLUS besoin d'être
                  signalé, puisque rien n'a encore été discuté. */}
              {motif === 'palier-ferme' && (
                <p className="adm-alerte-sp">
                  Secteur à secret professionnel sur une offre hébergée — rappeler avant
                  provisionnement. Seule la stack locale est ouverte à ce métier.
                </p>
              )}
              {motif === 'palier-inconnu' && (
                <p className="adm-alerte-sp">
                  Secteur à secret professionnel, <strong>aucun palier retenu</strong>{' '}
                  — rappeler avant toute proposition. Seule la stack locale est ouverte
                  à ce métier ; les offres hébergées lui sont fermées.
                </p>
              )}

              <p className="adm-besoin">{d.besoin}</p>

              <p className="adm-consent">
                Consentement enregistré le {dateFr(d.consentement)}
                {' · déposée il y a '}{age}{age > 1 ? ' jours' : ' jour'}
                {/* Le {' '} après </strong> est explicite : le compilateur JSX
                    mange l'espace qui suit une balise inline fermante (§52). */}
                {aPurger && (
                  <> · <strong>au-delà des 12 mois annoncés</strong>{' '}— à purger</>
                )}
                {d.tenantSlug && (
                  <>
                    {' · locataire '}<code>{d.tenantSlug}</code>
                    {!locataireActif && <>{' '}<strong>(supprimé)</strong></>}
                  </>
                )}
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
                    contestation (loi 2008-12, preuve du consentement).
                    🔴 §55.1 : le bouton n'agit plus au premier clic. Il ouvre une
                    confirmation (retaper l'e-mail), doublée d'une vérification
                    serveur qui refuse aussi tant qu'un locataire est lié. */}
                <SupprimerDemandeButton id={d.id} email={d.email} />
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

              {/* Locataire réellement EXISTANT : suppression possible (irréversible).
                  ⚠️ Conditionné à la table `Tenant`, pas à `tenantSlug` — sinon on
                  proposerait de dé-provisionner un conteneur déjà mort. */}
              {locataireActif && d.tenantSlug && (
                <div className="adm-aide">
                  <DeprovisionButton slug={d.tenantSlug} />
                </div>
              )}
            </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
