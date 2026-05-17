import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminCourseForm from '@/components/AdminCourseForm'
import AdminChaptersClient from '@/components/AdminChaptersClient'
import Link from 'next/link'

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const [admin, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.course.findUnique({
      where: { id },
      include: { chapters: { orderBy: { order: 'asc' } } },
    }),
  ])
  if (!admin) return null
  if (!course) notFound()

  return (
    <div className="app-shell">
      <AdminSidebar active="cours" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/cours" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Cours</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{course.title}</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            <AdminCourseForm
              mode="edit"
              course={{
                id: course.id, title: course.title, slug: course.slug,
                speaker: course.speaker, parcours: course.parcours,
                format: course.format, duration: course.duration,
                level: course.level, thumbClass: course.thumbClass,
              }}
            />
            <AdminChaptersClient
              courseId={course.id}
              chapters={course.chapters.map(ch => ({
                id: ch.id, title: ch.title, duration: ch.duration,
                format: ch.format, order: ch.order,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
