import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { formatRelative } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

function fmtDay(d: Date | string) {
  return new Date(d as unknown as string).toLocaleDateString('fr-FR', { day: '2-digit' })
}
function fmtMonthYear(d: Date | string) {
  const date = new Date(d as unknown as string)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

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

  const [allCourses, nextSession] = await Promise.all([
    prisma.course.findMany({
      orderBy: { createdAt: 'asc' },
      include: { chapters: { orderBy: { order: 'asc' } } },
    }),
    prisma.session.findFirst({
      where: { status: 'upcoming' },
      orderBy: { date: 'asc' },
    }),
  ])

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

  // Progress by parcours — average chapter % across all courses in the parcours
  const progressByParcours: Record<string, { total: number; sumPct: number }> = {}
  for (const course of allCourses) {
    if (!progressByParcours[course.parcours]) progressByParcours[course.parcours] = { total: 0, sumPct: 0 }
    progressByParcours[course.parcours].total++
    const p = user.progress.find(p => p.courseId === course.id)
    progressByParcours[course.parcours].sumPct += p?.percentage ?? 0
  }

  const parcoursList = Object.entries(progressByParcours).map(([name, { total, sumPct }]) => ({
    name,
    pct: Math.round(sumPct / total),
  }))

  // Recommendation: a course the user hasn't completed, different from the current one
  const completedIds = new Set(user.progress.filter(p => p.percentage === 100).map(p => p.courseId))
  const candidates = allCourses.filter(c => !completedIds.has(c.id) && c.id !== resumeCourse?.id)
  // Prefer same parcours as in-progress, then any not started
  const recommendation =
    candidates.find(c => c.parcours === inProgress?.course.parcours && !user.progress.find(p => p.courseId === c.id)) ??
    candidates.find(c => !user.progress.find(p => p.courseId === c.id)) ??
    candidates[0] ??
    null

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
      <Sidebar active="dashboard" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
      <div className="main">
        <Topbar placeholder="Rechercher un cours, un conférencier…" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
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

            {/* Prochaine session — dynamique */}
            <div className="sec-card">
              <span className="sec-label">Prochaine session</span>
              {nextSession ? (
                <>
                  <div className="date-big">{fmtDay(nextSession.date)}</div>
                  <div className="date-month" style={{ textTransform: 'capitalize' }}>
                    {fmtMonthYear(nextSession.date)}{nextSession.location ? ` · ${nextSession.location}` : ''}
                  </div>
                  <div className="sec-title">{nextSession.title}</div>
                  <div className="sec-meta">
                    par {nextSession.instructor}{nextSession.address ? ` · ${nextSession.address}` : ''}
                  </div>
                  <Link href="/presentiel" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: '12px' }}>
                    Préparer
                  </Link>
                </>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
                  Aucune session programmée pour le moment.<br />
                  <Link href="/presentiel" style={{ color: 'var(--coral)', fontSize: '12px' }}>Voir l&apos;agenda →</Link>
                </div>
              )}
            </div>

            {/* Progression globale — déjà dynamique */}
            <div className="sec-card">
              <span className="sec-label">Progression globale</span>
              {parcoursList.length > 0 ? (
                <div className="mini-progs">
                  {parcoursList.map(p => (
                    <div key={p.name} className="mp-row">
                      <div className="mp-hd"><span>{p.name}</span><span>{p.pct} %</span></div>
                      <div className="mp-bar"><div className="mp-fill" style={{ width: `${p.pct}%` }}></div></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Aucun cours disponible.</div>
              )}
            </div>

            {/* Recommandation — dynamique */}
            <div className="sec-card">
              <span className="sec-label">Recommandation</span>
              {recommendation ? (
                <>
                  <div className="sec-title">{recommendation.title}</div>
                  <div className="sec-meta">
                    {inProgress
                      ? `En lien avec votre parcours ${inProgress.course.parcours}.`
                      : `Pour démarrer votre parcours ${recommendation.parcours}.`}
                  </div>
                  <div className="sec-meta" style={{ fontSize: '12px' }}>
                    par {recommendation.speaker} · {recommendation.duration} min · {recommendation.format}
                  </div>
                  <Link href={`/cours/${recommendation.slug}`} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: '12px' }}>
                    Voir le cours
                  </Link>
                </>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
                  Félicitations — vous avez complété tous les cours disponibles !
                </div>
              )}
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
