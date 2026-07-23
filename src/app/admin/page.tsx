import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const [userCount, courseCount, chapterCount, progressList, demandesCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.chapter.count(),
    prisma.progress.findMany(),
    prisma.demandeAgent.count({ where: { statut: { in: ['nouvelle', 'qualifiee'] } } }),
  ])

  const completed = progressList.filter(p => p.percentage === 100).length
  const inProgress = progressList.filter(p => p.percentage > 0 && p.percentage < 100).length
  const avgPct = progressList.length
    ? Math.round(progressList.reduce((s, p) => s + p.percentage, 0) / progressList.length)
    : 0

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return (
    <div className="app-shell">
      <AdminSidebar active="dashboard" initials={user.initials} />
      <div className="main">
        <div className="page">
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>Administration</h1>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Vue globale de la plateforme MANIA</p>
          </div>

          {/* Stats */}
          <div className="sec-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: '32px' }}>
            {[
              { label: 'Utilisateurs', value: userCount, sub: 'comptes actifs', href: '/admin/users' },
              { label: 'Cours', value: courseCount, sub: `${chapterCount} chapitres`, href: '/admin/cours' },
              { label: 'En cours', value: inProgress, sub: 'progressions actives' },
              { label: 'Terminés', value: completed, sub: `moy. ${avgPct}%` },
              { label: 'Candidatures', value: demandesCount, sub: 'en attente', href: '/admin/demandes' },
            ].map(s => (
              <div key={s.label} className="sec-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>{value(s.value)}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.sub}</div>
                {s.href && <Link href={s.href} style={{ fontSize: '11px', color: 'var(--coral)', marginTop: '4px' }}>Voir →</Link>}
              </div>
            ))}
          </div>

          {/* Recent users */}
          <div className="activity-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Derniers inscrits</span>
              <Link href="/admin/users" style={{ fontSize: '12px', color: 'var(--coral)' }}>Tous les utilisateurs →</Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nom', 'Email', 'Rôle', 'Inscrit le'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 0', color: 'var(--muted)', fontSize: '11px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 0' }}>
                      <Link href={`/admin/users/${u.id}`} style={{ color: 'var(--fg)', fontWeight: 500 }}>{u.name}</Link>
                    </td>
                    <td style={{ padding: '10px 0', color: 'var(--muted)' }}>{u.email}</td>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{ fontSize: '11px', background: u.role === 'admin' ? 'var(--coral)' : 'var(--inset)', color: u.role === 'admin' ? 'white' : 'var(--muted)', borderRadius: '4px', padding: '2px 7px' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '10px 0', color: 'var(--muted)', fontSize: '12px' }}>{new Date(u.createdAt as unknown as string).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function value(n: number) {
  return n.toString()
}
