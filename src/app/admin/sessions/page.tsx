import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = { upcoming: 'À venir', past: 'Passée', cancelled: 'Annulée' }
const STATUS_COLOR: Record<string, string> = { upcoming: 'var(--coral)', past: 'var(--muted)', cancelled: '#aaa' }

export default async function AdminSessionsPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const sessions = await prisma.session.findMany({
    orderBy: { date: 'desc' },
    include: { _count: { select: { registrations: true } } },
  })

  return (
    <div className="app-shell">
      <AdminSidebar active="sessions" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Sessions présentiel</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{sessions.length} sessions</p>
            </div>
            <Link href="/admin/sessions/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouvelle session</Link>
          </div>
          <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Date', 'Titre', 'Lieu', 'Intervenant', 'Places', 'Statut', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(s.date as unknown as string).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{s.location}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{s.instructor}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                      {s._count.registrations}{s.maxSeats ? ` / ${s.maxSeats}` : ''}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', color: STATUS_COLOR[s.status] ?? 'var(--muted)', background: 'var(--inset)', borderRadius: '4px', padding: '2px 7px' }}>{STATUS_LABEL[s.status] ?? s.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/sessions/${s.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '32px 16px', color: 'var(--muted)', textAlign: 'center' }}>Aucune session. <Link href="/admin/sessions/new" style={{ color: 'var(--coral)' }}>Créer la première</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
