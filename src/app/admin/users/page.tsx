import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'
import AdminUsersClient from '@/components/AdminUsersClient'

export default async function AdminUsersPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { progress: true } } },
  })

  const items = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    initials: u.initials,
    createdAt: new Date(u.createdAt as unknown as string).toLocaleDateString('fr-FR'),
    courseCount: u._count.progress,
  }))

  return (
    <div className="app-shell">
      <AdminSidebar active="users" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Utilisateurs</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{items.length} comptes</p>
            </div>
            <Link href="/admin/users/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouvel utilisateur</Link>
          </div>
          <AdminUsersClient users={items} />
        </div>
      </div>
    </div>
  )
}
