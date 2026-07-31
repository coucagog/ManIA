// src/app/(public)/blog/[slug]/page.tsx
//
// Page article — gabarit de lecture (.read + .art-*). Un brouillon ou un slug
// inconnu renvoie un 404 propre : le public ne voit que les articles publiés.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { LIB_CATEGORIE } from '@/lib/categories-blog'
import { renderArticle, tempsLectureEstime } from '@/lib/article-render'
import { toneDe } from '@/lib/blog-tone'

function dateFr(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d)
}

async function articlePublie(slug: string) {
  const article = await prisma.article.findUnique({ where: { slug } })
  if (!article || article.statut !== 'publie') return null
  return article
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await articlePublie(slug)
  if (!article) return { title: 'Article introuvable — MANIA' }
  return {
    title: `${article.titre} — MANIA`,
    description: article.chapo,
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await articlePublie(slug)
  if (!article) notFound()

  const minutes = article.tempsLecture ?? tempsLectureEstime(article.contenu)

  // « À lire ensuite » : les 2 derniers autres articles publiés.
  const suivants = await prisma.article.findMany({
    where: { statut: 'publie', NOT: { id: article.id } },
    orderBy: { publieAt: 'desc' },
    take: 2,
  })

  return (
    <article className="read">
      <p className="art-eyebrow">{LIB_CATEGORIE[article.categorie] ?? article.categorie}</p>
      <h1 className="art-title">{article.titre}</h1>
      <p className="art-meta">
        {article.publieAt ? dateFr(article.publieAt) : ''}
        <span className="dot">·</span>
        {minutes} min de lecture
      </p>

      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="art-hero" src={article.imageUrl} alt=""
             style={{ width: '100%', objectFit: 'cover' }} />
      ) : (
        <div className={`art-hero ${toneDe(article.slug)}`} aria-hidden="true" />
      )}

      <p className="art-lead">{article.chapo}</p>

      {renderArticle(article.contenu)}

      <hr className="art-sep" />

      {suivants.length > 0 && (
        <>
          <p className="art-next-title">À lire ensuite</p>
          <div className="art-next-grid">
            {suivants.map(s => (
              <Link href={`/blog/${s.slug}`} className="art-card" key={s.id}>
                <span className="c-cat">{LIB_CATEGORIE[s.categorie] ?? s.categorie}</span>
                <p className="c-title">{s.titre}</p>
                <p className="c-meta">
                  {(s.tempsLecture ?? tempsLectureEstime(s.contenu))} min de lecture
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="art-cta">
        <div>
          <p className="t">Un agent configuré pour votre métier ?</p>
          <p className="s">Décrivez votre besoin, nous étudions votre demande.</p>
        </div>
        <Link href="/candidature" className="btn-cta-sm">Demander un agent</Link>
      </div>
    </article>
  )
}
