// src/app/(public)/page.tsx
//
// Landing publique. Remplace l'ancien src/app/page.tsx (qui ne faisait que
// rediriger). Un visiteur déjà connecté file droit à son espace ; la vitrine
// est réservée aux prospects anonymes.
//
// ⚠️ Deux fichiers ne peuvent pas résoudre la même URL : en ajoutant cette page,
//    il FAUT supprimer src/app/page.tsx (sinon collision « / » au build).

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { LIB_CATEGORIE } from '@/lib/categories-blog'
import { tempsLectureEstime } from '@/lib/article-render'
import { toneDe } from '@/lib/blog-tone'

export const metadata = {
  title: 'MANIA — Agents IA métier et formation, au Sénégal',
  description:
    'MANIA configure des agents IA pour les professionnels de tous secteurs et forme vos équipes aux bonnes pratiques des LLM. Données traitées au Sénégal, conformément à la loi n°2008-12.',
}

function dateCourteFr(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d)
}

export default async function LandingPage() {
  const session = await getSession()
  if (session?.userId) redirect('/dashboard') // ← retirer cette ligne pour l'option A

  // Aperçu blog : les 3 derniers articles publiés ; tant qu'il n'y en a pas,
  // la landing garde ses cartes « à venir ».
  const articles = await prisma.article.findMany({
    where: { statut: 'publie' },
    orderBy: { publieAt: 'desc' },
    take: 3,
  })

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="land-hero">
        <div className="land-hero-grid">
          <div>
            <p className="land-eyebrow">Plateforme IA · Dakar, Sénégal</p>
            <h1 className="land-h1">Un agent IA qui connaît votre métier, opéré au Sénégal.</h1>
            <p className="land-lead">
              MANIA configure des agents IA pour les professionnels de tous secteurs —
              commerce, droit, santé, restauration… — et forme vos équipes aux bonnes
              pratiques des LLM. Vos données restent maîtrisées.
            </p>
            <div className="land-hero-actions">
              <Link href="/candidature" className="land-btn">Demander un agent →</Link>
              <Link href="/formation" className="land-btn-ghost">Découvrir la formation</Link>
            </div>
          </div>

          {/* Aperçu d'agent */}
          <div className="land-hv">
            <div className="land-hv-head">
              <span className="land-hv-ico" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="3" />
                  <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <div>
                <div className="land-hv-name">Agent · Commerce</div>
                <div className="land-hv-org">Quincaillerie Ndiaye</div>
              </div>
              <span className="land-hv-badge"><span className="land-hv-dot" aria-hidden="true" />En ligne</span>
            </div>
            <div className="land-hv-msgs">
              <div className="land-hv-msg land-hv-msg--in">Prépare le devis pour la commande de ce matin.</div>
              <div className="land-hv-msg land-hv-msg--out">Devis rédigé dans votre modèle habituel. Souhaitez-vous que je l&apos;envoie au client ?</div>
            </div>
          </div>
        </div>

        {/* Bandeau stats */}
        <div className="land-stats">
          <div className="land-stat"><div className="land-stat-num">10</div><div className="land-stat-lbl">secteurs d&apos;activité couverts</div></div>
          <div className="land-stat"><div className="land-stat-num">100%</div><div className="land-stat-lbl">données traitées au Sénégal</div></div>
          <div className="land-stat"><div className="land-stat-num">2008-12</div><div className="land-stat-lbl">conforme à la loi sénégalaise</div></div>
        </div>
      </section>

      {/* ===== DEUX PRODUITS ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Deux produits, deux besoins</p>
        <h2 className="land-h2">Choisissez votre point de départ</h2>

        <div className="land-paths">
          <div className="land-path">
            <span className="land-path-accent land-path-accent--coral" aria-hidden="true" />
            <div className="land-path-head">
              <span className="land-path-ico land-path-ico--coral" aria-hidden="true">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="3" />
                  <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="land-path-tag land-path-tag--coral">Offre 1 · Pour votre activité</span>
            </div>
            <h3>Agents IA personnels</h3>
            <p>Un agent configuré pour votre métier — commerce, droit, restauration, immobilier, santé et tout autre secteur — et déployé avec vous.</p>
            <ul>
              <li><span aria-hidden="true">·</span> Paramétré sur vos usages et votre vocabulaire</li>
              <li><span aria-hidden="true">·</span> Espace client isolé, données maîtrisées</li>
              <li><span aria-hidden="true">·</span> Mise en service accompagnée, pas en libre-service</li>
            </ul>
            <Link href="/candidature" className="land-btn land-path-btn">Demander un agent →</Link>
          </div>

          <div className="land-path">
            <span className="land-path-accent land-path-accent--fg" aria-hidden="true" />
            <div className="land-path-head">
              <span className="land-path-ico land-path-ico--fg" aria-hidden="true">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="7" y1="16" x2="13" y2="16" />
                </svg>
              </span>
              <span className="land-path-tag">Offre 2 · Pour vos équipes</span>
            </div>
            <h3>Formation aux agents IA</h3>
            <p>Apprenez à utiliser les LLM et les agents dans les règles de l&apos;art, du prompt aux workflows en production.</p>
            <ul>
              <li><span aria-hidden="true">·</span> Parcours en ligne et sessions en présentiel</li>
              <li><span aria-hidden="true">·</span> Bonnes pratiques, sécurité et limites des modèles</li>
              <li><span aria-hidden="true">·</span> Cas concrets adaptés à votre métier</li>
            </ul>
            <Link href="/formation" className="land-btn-soft land-path-btn">Voir la formation →</Link>
          </div>
        </div>
      </section>

      {/* ===== CONFIANCE / CONFORMITÉ ===== */}
      <section className="land-section">
        <div className="land-trust">
          <p className="land-eyebrow">Confiance &amp; conformité</p>
          <h2 className="land-trust-h2">Conçu pour des professionnels qui manipulent des données sensibles</h2>
          <div className="land-trust-cols">
            <div>
              <div className="land-trust-ico" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 3 4 6.5v5c0 4.4 3.1 7.7 8 9 4.9-1.3 8-4.6 8-9v-5L12 3Z" />
                </svg>
              </div>
              <h3>Données traitées au Sénégal</h3>
              <p>Vos informations restent dans le pays, conformément à la loi n°2008-12. Ni revente, ni transmission à des tiers.</p>
            </div>
            <div>
              <div className="land-trust-ico" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <h3>Espaces clients isolés</h3>
              <p>Chaque client dispose de son propre espace cloisonné. Aucune donnée n&apos;est partagée entre clients.</p>
            </div>
            <div>
              <div className="land-trust-ico" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M4 20c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5" />
                  <path d="M16 4a4 4 0 0 1 0 8" />
                </svg>
              </div>
              <h3>Accompagnement humain</h3>
              <p>Nous configurons et déployons chaque agent avec vous. Un interlocuteur reste joignable après la mise en service.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== APERÇU BLOG ===== */}
      <section className="land-section">
        <div className="land-blog-head">
          <div>
            <p className="land-eyebrow">Le blog</p>
            <h2 className="land-h2">
              {articles.length > 0 ? 'Nos bonnes pratiques' : 'Bientôt : nos bonnes pratiques'}
            </h2>
          </div>
          <Link href="/blog" className="land-blog-all">Tous les articles →</Link>
        </div>
        <div className="land-blog">
          {articles.length > 0 ? (
            articles.map(a => (
              <Link href={`/blog/${a.slug}`} className="land-blog-card" key={a.id} style={{ textDecoration: 'none' }}>
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="land-blog-img" src={a.imageUrl} alt="" style={{ objectFit: 'cover', width: '100%' }} />
                ) : (
                  <div className={`land-blog-img ${toneDe(a.slug)}`} aria-hidden="true" />
                )}
                <div className="land-blog-body">
                  <span className="land-blog-cat">{LIB_CATEGORIE[a.categorie] ?? a.categorie}</span>
                  <h3>{a.titre}</h3>
                  <p className="land-blog-meta">
                    {a.publieAt ? dateCourteFr(a.publieAt) : ''} · {a.tempsLecture ?? tempsLectureEstime(a.contenu)} min
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <>
              <article className="land-blog-card">
                <div className="land-blog-img" aria-hidden="true"><span>image · 16:10</span></div>
                <div className="land-blog-body">
                  <span className="land-blog-cat">Bonnes pratiques</span>
                  <h3>Pourquoi un agent doit connaître votre métier</h3>
                  <p className="land-blog-meta">À venir · 5 min</p>
                </div>
              </article>
              <article className="land-blog-card">
                <div className="land-blog-img" aria-hidden="true"><span>image · 16:10</span></div>
                <div className="land-blog-body">
                  <span className="land-blog-cat">Sécurité</span>
                  <h3>Secret professionnel et IA : ce que dit la loi</h3>
                  <p className="land-blog-meta">À venir · 7 min</p>
                </div>
              </article>
              <article className="land-blog-card">
                <div className="land-blog-img" aria-hidden="true"><span>image · 16:10</span></div>
                <div className="land-blog-body">
                  <span className="land-blog-cat">Formation</span>
                  <h3>Prompt, contexte, agent : le vocabulaire utile</h3>
                  <p className="land-blog-meta">À venir · 4 min</p>
                </div>
              </article>
            </>
          )}
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="land-section">
        <div className="land-cta">
          <h2>Prêt à confier une tâche à un agent ?</h2>
          <p>Décrivez votre activité et votre besoin. Nous étudions chaque demande et revenons vers vous par e-mail — chaque agent est configuré pour un métier précis.</p>
          <div className="land-cta-actions">
            <Link href="/candidature" className="land-btn">Demander un agent →</Link>
            <Link href="/formation" className="land-btn-soft">Découvrir la formation</Link>
          </div>
        </div>
      </section>
    </>
  )
}
