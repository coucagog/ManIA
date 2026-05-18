import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminSessionForm from '@/components/AdminSessionForm'
import Link from 'next/link'

export default async function NewSessionPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const [admin, experts] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.expert.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
  ])
  if (!admin) return null
  const expertNames = experts.map(e => e.name)

  return (
    <div className="app-shell">
      <AdminSidebar active="sessions" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/sessions" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Sessions</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>Nouvelle session</h1>
          </div>
          <AdminSessionForm mode="create" experts={expertNames} />
        </div>
      </div>
    </div>
  )
}
