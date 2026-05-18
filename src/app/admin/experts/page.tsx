import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'

export default async function AdminExpertsPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const experts = await prisma.expert.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] })

  return (
    <div className="app-shell">
      <AdminSidebar active="experts" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Experts</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{experts.length} expert{experts.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/admin/experts/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouvel expert</Link>
          </div>
          <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Expert', 'Titre', 'Institution', 'Lié à', 'Ordre', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {experts.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{e.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{e.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{e.institution ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>{e.speakerKey ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{e.order}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/experts/${e.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                    </td>
                  </tr>
                ))}
                {experts.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px 16px', color: 'var(--muted)', textAlign: 'center' }}>Aucun expert. <Link href="/admin/experts/new" style={{ color: 'var(--coral)' }}>Ajouter le premier</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
