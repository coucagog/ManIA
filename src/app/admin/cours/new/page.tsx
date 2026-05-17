import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminCourseForm from '@/components/AdminCourseForm'
import Link from 'next/link'

export default async function NewCoursePage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  return (
    <div className="app-shell">
      <AdminSidebar active="cours" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/cours" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Cours</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>Nouveau cours</h1>
          </div>
          <AdminCourseForm mode="create" />
        </div>
      </div>
    </div>
  )
}
