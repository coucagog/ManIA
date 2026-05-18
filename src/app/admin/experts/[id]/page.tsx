import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminExpertForm from '@/components/AdminExpertForm'
import Link from 'next/link'

export default async function AdminExpertPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const { id } = await params
  const [admin, expert, courses, users] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.expert.findUnique({ where: { id } }),
    prisma.course.findMany({ select: { speaker: true }, distinct: ['speaker'] }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, photoUrl: true, initials: true }, orderBy: { name: 'asc' } }),
  ])
  if (!admin) return null
  if (!expert) notFound()
  const speakers = courses.map(c => c.speaker).sort()

  return (
    <div className="app-shell">
      <AdminSidebar active="experts" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '560px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/experts" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Experts</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{expert.name}</h1>
          </div>
          <AdminExpertForm
            mode="edit"
            speakers={speakers}
            users={users}
            expert={{
              id: expert.id,
              userId: expert.userId,
              name: expert.name,
              title: expert.title,
              institution: expert.institution,
              bio: expert.bio,
              photoUrl: expert.photoUrl,
              speakerKey: expert.speakerKey,
              order: expert.order,
            }}
          />
        </div>
      </div>
    </div>
  )
}
