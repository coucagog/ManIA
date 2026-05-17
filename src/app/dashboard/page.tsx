import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { formatRelative } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      progress: {
        include: { course: { include: { chapters: { orderBy: { order: 'asc' } } } } },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!user) return null

  const allCourses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: { chapters: { orderBy: { order: 'asc' } } },
  })

  // In-progress: has progress, not 100%, sorted by most recent
  const inProgress = user.progress.find(p => p.percentage > 0 && p.percentage < 100)

  const resumeCourse = inProgress?.course ?? allCourses[0]
  const resumeProgress = inProgress?.percentage ?? 0
  const activeChapter = inProgress
    ? (inProgress.course.chapters.find(c => c.id === inProgress.lastChapterId) ?? inProgress.course.chapters[0])
    : resumeCourse?.chapters[0]

  // Last session date
  const lastUpdated = user.progress[0]?.updatedAt
  const lastSeen = lastUpdated ? formatRelative(lastUpdated as unknown as string) : null

  // Progress by parcours
  const progressByParcours: Record<string, { total: number; done: number }> = {}
  for (const course of allCourses) {
    if (!progressByParcours[course.parcours]) progressByParcours[course.parcours] = { total: 0, done: 0 }
    progressByParcours[course.parcours].total++
    const p = user.progress.find(p => p.courseId === course.id)
    if (p && p.percentage === 100) progressByParcours[course.parcours].done++
  }

  const parcoursList = Object.entries(progressByParcours).map(([name, { total, done }]) => ({
    name,
    pct: Math.round((done / total) * 100),
  }))

  // Activity feed from real progress data
  const activities = user.progress
    .filter(p => p.percentage > 0)
    .slice(0, 4)
    .map(p => {
      if (p.percentage === 100) {
        return {
          text: `Module achevé — ${p.course.title}, Parcours ${p.course.parcours}`,
          time: formatRelative(p.updatedAt as unknown as string),
          accent: true,
        }
      }
      const ch = p.course.chapters.find(c => c.id === p.lastChapterId)
      return {
        text: `Cours repris — ${p.course.title}${ch ? `, chapitre ${ch.order}` : ''}`,
        time: formatRelative(p.updatedAt as unknown as string),
        accent: false,
      }
    })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="app-shell">
      <Sidebar active="dashboard" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher un cours, un conférencier…" initials={user.initials} />
        <div className="page">
          <h1 className="greeting">{greeting}, {user.name}.</h1>

          {resumeCourse && (
            <div className="resume-card">
              <div className="thumb cc-thumb-lbl">{resumeCourse.parcours}</div>
              <div className="resume-info">
                <span className="parcours-tag">Parcours {resumeCourse.parcours}</span>
                <div className="course-name">{resumeCourse.title}</div>
                {activeChapter && (
                  <div className="chapter-name">
                    Chapitre {activeChapter.order} — {activeChapter.title}
                  </div>
                )}
                <div className="prog-wrap">
                  <div className="prog-bar"><div className="prog-fill" style={{ width: `${resumeProgress}%` }}></div></div>
                  <span className="prog-label">{resumeProgress} % complété</span>
                </div>
                {lastSeen && <span className="last-seen">Dernière session : {lastSeen}.</span>}
              </div>
              <div className="resume-cta">
                <Link
                  href={`/cours/${resumeCourse.slug}${inProgress?.lastChapterId ? `?ch=${inProgress.lastChapterId}` : ''}`}
                  className="btn-cta"
                >Reprendre →</Link>
                <Link href="/catalogue" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 14px' }}>Voir le catalogue</Link>
              </div>
            </div>
          )}

          <div className="sec-grid">
            <div className="sec-card">
              <span className="sec-label">Prochaine session</span>
              <div className="date-big">12</div>
              <div className="date-month">Juin 2025 · Paris</div>
              <div className="sec-title">Souveraineté numérique et IA agentique</div>
              <div className="sec-meta">par Pr. Ibrahim Al-Mansouri · Amphithéâtre Condorcet</div>
              <button className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: '12px' }}>Préparer</button>
            </div>

            <div className="sec-card">
              <span className="sec-label">Progression globale</span>
              <div className="mini-progs">
                {parcoursList.map(p => (
                  <div key={p.name} className="mp-row">
                    <div className="mp-hd"><span>{p.name}</span><span>{p.pct} %</span></div>
                    <div className="mp-bar"><div className="mp-fill" style={{ width: `${p.pct}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sec-card">
              <span className="sec-label">Recommandation</span>
              <div className="sec-title">Évaluation des risques dans les systèmes d&apos;IA autonomes</div>
              <div className="sec-meta">En lien avec votre dernier module sur l&apos;orchestration multi-agents.</div>
              <div className="sec-meta" style={{ fontSize: '12px' }}>par Dr. Amara Ndiaye · 42 min · Vidéo</div>
              <Link href="/catalogue" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: '12px' }}>Voir le cours</Link>
            </div>
          </div>

          {activities.length > 0 && (
            <div className="activity-card">
              <div className="card-label">Activité récente</div>
              <div className="act-list">
                {activities.map((a, i) => (
                  <div key={i} className="act-item">
                    <div className="act-dot" style={!a.accent ? { background: 'var(--muted)', opacity: 0.4 } : {}}></div>
                    <span className="act-text" style={!a.accent ? { color: 'var(--muted)' } : {}}>{a.text}</span>
                    <span className="act-time" style={!a.accent ? { color: 'var(--muted)' } : {}}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <MobileNav active="dashboard" />
    </div>
  )
}
