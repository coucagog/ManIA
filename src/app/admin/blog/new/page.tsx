// src/app/admin/blog/new/page.tsx — création d'un article.

import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminArticleForm from '@/components/AdminArticleForm'

export default async function AdminBlogNewPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  return (
    <div className="app-shell">
      <AdminSidebar active="blog" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: 780 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>Nouvel article</h1>
          <AdminArticleForm mode="create" />
        </div>
      </div>
    </div>
  )
}
