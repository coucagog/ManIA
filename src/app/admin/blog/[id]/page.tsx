// src/app/admin/blog/[id]/page.tsx — édition d'un article.

import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminArticleForm from '@/components/AdminArticleForm'

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const { id } = await params
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) notFound()

  return (
    <div className="app-shell">
      <AdminSidebar active="blog" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: 780 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>Modifier l&apos;article</h1>
          <AdminArticleForm
            mode="edit"
            article={{
              id: article.id,
              slug: article.slug,
              titre: article.titre,
              chapo: article.chapo,
              contenu: article.contenu,
              categorie: article.categorie,
              imageUrl: article.imageUrl,
              tempsLecture: article.tempsLecture,
              statut: article.statut,
            }}
          />
        </div>
      </div>
    </div>
  )
}
