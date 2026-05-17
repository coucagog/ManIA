import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

export default async function CataloguePage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: { progress: { where: { userId: session.userId } } },
  })

  const parcours = [...new Set(courses.map(c => c.parcours))]

  return (
    <div className="app-shell">
      <Sidebar active="catalog" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher dans le catalogue…" initials={user.initials} />
        <div className="page">
          <div className="cat-hd">
            <h1 className="cat-title">Catalogue</h1>
            <p className="cat-sub">Quatre parcours. Cours indépendants ou séquences complètes.</p>
          </div>
          <div className="cat-body">
            <div className="filter-panel">
              <div className="f-section">
                <div className="f-sec-label">Parcours</div>
                <div className="f-opts">
                  {parcours.map(p => (
                    <div key={p} className="f-opt">
                      <div className="f-box on">✓</div> {p}
                    </div>
                  ))}
                </div>
              </div>
              <div className="f-section">
                <div className="f-sec-label">Format</div>
                <div className="f-opts">
                  <div className="f-opt"><div className="f-box on">✓</div> Vidéo</div>
                  <div className="f-opt"><div className="f-box on">✓</div> Texte</div>
                  <div className="f-opt"><div className="f-box"></div> Présentiel</div>
                </div>
              </div>
              <div className="f-section">
                <div className="f-sec-label">Niveau</div>
                <div className="f-opts">
                  <div className="f-opt"><div className="f-box"></div> Initiation</div>
                  <div className="f-opt"><div className="f-box on">✓</div> Maîtrise</div>
                  <div className="f-opt"><div className="f-box"></div> Expertise</div>
                </div>
              </div>
            </div>

            <div className="cg">
              {courses.map(course => {
                const prog = course.progress[0]?.percentage ?? 0
                const inProg = prog > 0 && prog < 100
                return (
                  <Link key={course.id} href={`/cours/${course.slug}`} className="cc">
                    <div className={`cc-thumb ${course.thumbClass}`}>
                      <div className="cc-thumb-lbl">{course.parcours}</div>
                      <span className={`cc-badge${inProg ? ' inprog' : ''}`}>
                        {inProg ? 'En cours' : course.format}
                      </span>
                    </div>
                    <div className="cc-body">
                      <div className="cc-title">{course.title}</div>
                      <div className="cc-speaker">par {course.speaker}</div>
                      <div className="cc-meta">
                        {course.duration} min <span className="cc-dot">·</span> {course.level}
                      </div>
                      {prog > 0 && (
                        <div className="cc-prog">
                          <div className="cc-prog-fill" style={{ width: `${prog}%` }}></div>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <MobileNav active="catalog" />
    </div>
  )
}
