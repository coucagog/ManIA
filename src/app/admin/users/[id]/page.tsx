import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminUserForm from '@/components/AdminUserForm'
import Link from 'next/link'

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const [admin, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.user.findUnique({
      where: { id },
      include: {
        progress: { include: { course: true }, orderBy: { updatedAt: 'desc' } },
        _count: { select: { notes: true } },
      },
    }),
  ])
  if (!admin) return null
  if (!target) notFound()

  return (
    <div className="app-shell">
      <AdminSidebar active="users" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/admin/users" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Utilisateurs</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{target.name}</h1>
            <span style={{ fontSize: '11px', background: target.role === 'admin' ? 'var(--coral)' : 'var(--inset)', color: target.role === 'admin' ? 'white' : 'var(--muted)', borderRadius: '4px', padding: '2px 8px' }}>{target.role}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Edit form */}
            <AdminUserForm
              mode="edit"
              user={{ id: target.id, name: target.name, email: target.email, role: target.role }}
            />

            {/* Stats + progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="sec-card">
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Activité</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Cours suivis', v: target.progress.length },
                    { l: 'Terminés', v: target.progress.filter(p => p.percentage === 100).length },
                    { l: 'Notes', v: target._count.notes },
                    { l: 'Inscrit le', v: new Date(target.createdAt as unknown as string).toLocaleDateString('fr-FR') },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--coral)' }}>{s.v}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {target.progress.length > 0 && (
                <div className="sec-card">
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Progression</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {target.progress.map(p => (
                      <div key={p.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--fg)' }}>{p.course.title}</span>
                          <span style={{ color: 'var(--coral)' }}>{p.percentage}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--inset)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${p.percentage}%`, background: 'var(--coral)', borderRadius: '2px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
