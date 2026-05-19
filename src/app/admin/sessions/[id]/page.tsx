import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminSessionForm from '@/components/AdminSessionForm'
import Link from 'next/link'

function toLocalInput(d: unknown) {
  if (!d) return ''
  const date = new Date(d as string)
  // Format: YYYY-MM-DDTHH:mm (for datetime-local input)
  return date.toISOString().slice(0, 16)
}

export default async function AdminSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const { id } = await params
  const [admin, s, experts, registrations] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.session.findUnique({ where: { id } }),
    prisma.expert.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.sessionRegistration.findMany({
      where: { sessionId: id },
      include: { user: { select: { name: true, email: true, initials: true } } },
      orderBy: { registeredAt: 'asc' },
    }),
  ])
  if (!admin) return null
  if (!s) notFound()
  const expertNames = experts.map(e => e.name)

  return (
    <div className="app-shell">
      <AdminSidebar active="sessions" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/sessions" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Sessions</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{s.title}</h1>
          </div>
          <AdminSessionForm
            mode="edit"
            experts={expertNames}
            session={{
              id: s.id, title: s.title,
              date: toLocalInput(s.date),
              endDate: s.endDate ? toLocalInput(s.endDate) : null,
              location: s.location, address: s.address,
              description: s.description, instructor: s.instructor,
              maxSeats: s.maxSeats, status: s.status,
            }}
          />

          {/* Registrants */}
          <div className="sec-card">
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
              Inscrits — {registrations.length}{s.maxSeats ? ` / ${s.maxSeats}` : ''}
            </div>
            {registrations.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Aucun inscrit pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {registrations.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < registrations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--coral)', fontWeight: 600, flexShrink: 0 }}>
                      {r.user.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{r.user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{r.user.email}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.registeredAt as unknown as string).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
