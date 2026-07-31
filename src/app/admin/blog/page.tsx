// src/app/admin/blog/page.tsx — liste des articles (admin). Patron /admin/cours.

import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'
import { LIB_CATEGORIE } from '@/lib/categories-blog'

function dateFr(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(d)
}

export default async function AdminBlogPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const articles = await prisma.article.findMany({
    orderBy: [{ statut: 'asc' }, { updatedAt: 'desc' }],
  })

  return (
    <div className="app-shell">
      <AdminSidebar active="blog" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Blog</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                {articles.length} article{articles.length > 1 ? 's' : ''} ·{' '}
                {articles.filter(a => a.statut === 'publie').length} publié(s)
              </p>
            </div>
            <Link href="/admin/blog/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouvel article</Link>
          </div>

          <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Titre', 'Catégorie', 'Statut', 'Publié le', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <div>{a.titre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{a.slug}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{LIB_CATEGORIE[a.categorie] ?? a.categorie}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '11px', borderRadius: '4px', padding: '2px 7px',
                        background: a.statut === 'publie' ? 'var(--coral)' : 'var(--inset)',
                        color: a.statut === 'publie' ? 'white' : 'var(--muted)',
                      }}>
                        {a.statut === 'publie' ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                      {a.publieAt ? dateFr(a.publieAt) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/blog/${a.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '32px 16px', color: 'var(--muted)', textAlign: 'center' }}>Aucun article. <Link href="/admin/blog/new" style={{ color: 'var(--coral)' }}>Écrire le premier</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
