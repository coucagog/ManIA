// src/app/(public)/blog/page.tsx
//
// Liste publique des articles. Composant SERVEUR : le filtre par catégorie et
// la pagination passent par l'URL (?categorie=…&page=…) — liens indexables,
// aucun état client. Les brouillons ne sortent JAMAIS d'ici (statut publie).

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CATEGORIES_BLOG, CATEGORIE_SLUGS, LIB_CATEGORIE } from '@/lib/categories-blog'
import { tempsLectureEstime } from '@/lib/article-render'
import { toneDe } from '@/lib/blog-tone'

export const metadata = {
  title: 'Blog — MANIA',
  description:
    'Bonnes pratiques de l’IA, repères juridiques (loi n°2008-12, secret professionnel) et nouvelles de la plateforme — pour les professionnels de tous les secteurs.',
}

const PAR_PAGE = 9

function dateFr(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d)
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; page?: string }>
}) {
  const sp = await searchParams
  const categorie = sp.categorie && CATEGORIE_SLUGS.includes(sp.categorie) ? sp.categorie : null
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)

  const where = { statut: 'publie', ...(categorie ? { categorie } : {}) }

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { publieAt: 'desc' },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE))

  // Article à la une : le plus récent, seulement en première page sans filtre.
  const feat = page === 1 && !categorie && articles.length > 0 ? articles[0] : null
  const grille = feat ? articles.slice(1) : articles

  const minutes = (a: { tempsLecture: number | null; contenu: string }) =>
    a.tempsLecture ?? tempsLectureEstime(a.contenu)

  const lienPage = (p: number) =>
    `/blog?${categorie ? `categorie=${categorie}&` : ''}page=${p}`

  return (
    <div className="blog-page">
      <h1 className="blog-h1">Le blog</h1>
      <p className="blog-sub">
        Bonnes pratiques de l&apos;IA, repères juridiques et nouvelles de la
        plateforme — pour les professionnels de tous les secteurs.
      </p>

      {/* ── À la une ── */}
      {feat && (
        <Link href={`/blog/${feat.slug}`} className="blog-feat">
          {feat.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="blog-feat-img" src={feat.imageUrl} alt="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          ) : (
            <div className={`blog-feat-img ${toneDe(feat.slug)}`}>
              <span className="blog-feat-tag">À la une</span>
            </div>
          )}
          <div className="blog-feat-body">
            <span className="blog-cat">{LIB_CATEGORIE[feat.categorie] ?? feat.categorie}</span>
            <h2>{feat.titre}</h2>
            <p>{feat.chapo}</p>
            <span className="blog-meta">
              {feat.publieAt ? dateFr(feat.publieAt) : ''} · {minutes(feat)} min de lecture
            </span>
          </div>
        </Link>
      )}

      {/* ── Filtres par catégorie (liens serveur, puce active en creux) ── */}
      <div className="blog-chips">
        <Link href="/blog" className={`pchip${!categorie ? ' is-active' : ''}`}>Toutes</Link>
        {CATEGORIES_BLOG.map(c => (
          <Link
            key={c.slug}
            href={`/blog?categorie=${c.slug}`}
            className={`pchip${categorie === c.slug ? ' is-active' : ''}`}
          >
            {c.libelle}
          </Link>
        ))}
      </div>

      {/* ── Grille ── */}
      {total === 0 ? (
        <div className="fp-vide">
          {categorie
            ? 'Aucun article dans cette catégorie pour le moment.'
            : 'Les premiers articles arrivent bientôt.'}
        </div>
      ) : (
        <div className="blog-grid">
          {grille.map(a => (
            <Link href={`/blog/${a.slug}`} className="blog-card" key={a.id}>
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="blog-card-img" src={a.imageUrl} alt="" />
              ) : (
                <div className={`blog-card-img ${toneDe(a.slug)}`} aria-hidden="true" />
              )}
              <div className="blog-card-body">
                <span className="blog-cat">{LIB_CATEGORIE[a.categorie] ?? a.categorie}</span>
                <h3>{a.titre}</h3>
                <p>{a.chapo}</p>
                <span className="blog-meta">
                  {a.publieAt ? dateFr(a.publieAt) : ''} · {minutes(a)} min
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <nav className="blog-pagenav" aria-label="Pagination">
          <Link
            href={lienPage(page - 1)}
            className={`blog-pagebtn${page <= 1 ? ' is-disabled' : ''}`}
            aria-label="Page précédente"
          >
            ‹
          </Link>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={lienPage(p)}
              className={`blog-pagebtn${p === page ? ' is-active' : ''}`}
            >
              {p}
            </Link>
          ))}
          <Link
            href={lienPage(page + 1)}
            className={`blog-pagebtn${page >= totalPages ? ' is-disabled' : ''}`}
            aria-label="Page suivante"
          >
            ›
          </Link>
        </nav>
      )}

      {/* ── Encart discret vers la candidature ── */}
      <div className="art-cta" style={{ marginTop: 48 }}>
        <div>
          <p className="t">Un agent pour votre activité ?</p>
          <p className="s">
            Nous configurons un agent IA adapté à votre métier et à vos
            exigences de confidentialité. Parlons-en.
          </p>
        </div>
        <Link href="/candidature" className="btn-cta-sm">Faire une demande</Link>
      </div>
    </div>
  )
}
