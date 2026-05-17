import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { formatRelative } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function MesCoursPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const progress = await prisma.progress.findMany({
    where: { userId: session.userId, percentage: { gt: 0 } },
    include: { course: { include: { chapters: { orderBy: { order: 'asc' } } } } },
    orderBy: { updatedAt: 'desc' },
  })

  // If only one course in progress, go straight to it
  if (progress.length === 1) {
    const p = progress[0]
    const chParam = p.lastChapterId ? `?ch=${p.lastChapterId}` : ''
    redirect(`/cours/${p.course.slug}${chParam}`)
  }

  return (
    <div className="app-shell">
      <Sidebar active="lesson" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher un cours…" initials={user.initials} />
        <div className="page">
          <h1 className="cat-title" style={{ marginBottom: '8px' }}>Mes cours</h1>
          <p className="cat-sub" style={{ marginBottom: '28px' }}>
            {progress.length === 0 ? 'Aucun cours commencé.' : `${progress.length} cours en cours ou terminés.`}
          </p>

          {progress.length === 0 ? (
            <Link href="/catalogue" className="btn-cta" style={{ display: 'inline-block' }}>
              Explorer le catalogue →
            </Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {progress.map(p => {
                const ch = p.course.chapters.find(c => c.id === p.lastChapterId) ?? p.course.chapters[0]
                const chParam = p.lastChapterId ? `?ch=${p.lastChapterId}` : ''
                return (
                  <div key={p.id} className="resume-card">
                    <div className="thumb cc-thumb-lbl">{p.course.parcours}</div>
                    <div className="resume-info">
                      <span className="parcours-tag">Parcours {p.course.parcours}</span>
                      <div className="course-name">{p.course.title}</div>
                      {ch && (
                        <div className="chapter-name">
                          {p.percentage === 100 ? '✓ Terminé' : `Chapitre ${ch.order} — ${ch.title}`}
                        </div>
                      )}
                      <div className="prog-wrap">
                        <div className="prog-bar"><div className="prog-fill" style={{ width: `${p.percentage}%` }}></div></div>
                        <span className="prog-label">{p.percentage} %</span>
                      </div>
                      <span className="last-seen">Dernière activité : {formatRelative(p.updatedAt as unknown as string)}.</span>
                    </div>
                    <div className="resume-cta">
                      <Link href={`/cours/${p.course.slug}${chParam}`} className="btn-cta">
                        {p.percentage === 100 ? 'Revoir →' : 'Continuer →'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <MobileNav active="lesson" />
    </div>
  )
}
