import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      progress: { include: { course: { include: { chapters: { orderBy: { order: 'asc' } } } } } },
    },
  })

  if (!user) return null

  const allCourses = await prisma.course.findMany({ orderBy: { createdAt: 'asc' } })

  // Find in-progress course (highest % but not 100)
  const inProgress = user.progress
    .filter(p => p.percentage > 0 && p.percentage < 100)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]

  const resumeCourse = inProgress?.course ?? allCourses[0]
  const resumeProgress = inProgress?.percentage ?? 0
  const activeChapter = inProgress?.course.chapters.find(c => c.id === inProgress?.lastChapterId)
    ?? resumeCourse?.chapters[0]

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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const title = 'Madame la Conseillère'

  return (
    <div className="app-shell">
      <Sidebar active="dashboard" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher un cours, un conférencier…" initials={user.initials} />
        <div className="page">
          <h1 className="greeting">{greeting}, {title}.</h1>

          {resumeCourse && (
            <div className="resume-card">
              <div className={`thumb cc-thumb-lbl`}>{resumeCourse.parcours}</div>
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
                <span className="last-seen">Dernière session : il y a 2 jours.</span>
              </div>
              <div className="resume-cta">
                <Link href={`/cours/${resumeCourse.slug}`} className="btn-cta">Reprendre →</Link>
                <button className="btn-ghost" style={{ fontSize: '12px', padding: '8px 14px' }}>Télécharger</button>
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

          <div className="activity-card">
            <div className="card-label">Activité récente</div>
            <div className="act-list">
              <div className="act-item">
                <div className="act-dot"></div>
                <span className="act-text">Module achevé — <em>Fondements des LLM</em>, Parcours Fondations IA</span>
                <span className="act-time">hier</span>
              </div>
              <div className="act-item">
                <div className="act-dot"></div>
                <span className="act-text">Attestation disponible — <em>Parcours Fondations IA</em></span>
                <span className="act-time">hier</span>
              </div>
              <div className="act-item">
                <div className="act-dot" style={{ background: 'var(--muted)', opacity: .4 }}></div>
                <span className="act-text" style={{ color: 'var(--muted)' }}>Session présentielle — Paris, 12 juin · Confirmation envoyée</span>
                <span className="act-time" style={{ color: 'var(--muted)' }}>il y a 3 j</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav active="dashboard" />
    </div>
  )
}
