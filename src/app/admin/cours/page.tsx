import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'

export default async function AdminCoursPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { chapters: true, progress: true } },
    },
  })

  return (
    <div className="app-shell">
      <AdminSidebar active="cours" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Cours</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{courses.length} cours</p>
            </div>
            <Link href="/admin/cours/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouveau cours</Link>
          </div>

          <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Titre', 'Parcours', 'Intervenant', 'Chapitres', 'Inscrits', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <div>{c.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{c.slug}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{c.parcours}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{c.speaker}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{c._count.chapters}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{c._count.progress}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/cours/${c.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px 16px', color: 'var(--muted)', textAlign: 'center' }}>Aucun cours. <Link href="/admin/cours/new" style={{ color: 'var(--coral)' }}>Créer le premier</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
