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
  const [admin, s] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.session.findUnique({ where: { id } }),
  ])
  if (!admin) return null
  if (!s) notFound()

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
            session={{
              id: s.id, title: s.title,
              date: toLocalInput(s.date),
              endDate: s.endDate ? toLocalInput(s.endDate) : null,
              location: s.location, address: s.address,
              description: s.description, instructor: s.instructor,
              maxSeats: s.maxSeats, status: s.status,
            }}
          />
        </div>
      </div>
    </div>
  )
}
