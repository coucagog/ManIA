import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminUserForm from '@/components/AdminUserForm'

export default async function NewUserPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  return (
    <div className="app-shell">
      <AdminSidebar active="users" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '560px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>Nouvel utilisateur</h1>
          </div>
          <AdminUserForm mode="create" />
        </div>
      </div>
    </div>
  )
}
