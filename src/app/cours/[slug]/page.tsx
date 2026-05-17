import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

export default async function CoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { chapters: { orderBy: { order: 'asc' } } },
  })

  if (!course) notFound()

  const progress = await prisma.progress.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId: course.id } },
  })

  const activeChapterId = progress?.lastChapterId ?? course.chapters[0]?.id
  const activeChapter = course.chapters.find(c => c.id === activeChapterId) ?? course.chapters[0]
  const activeIdx = course.chapters.findIndex(c => c.id === activeChapter?.id)

  const prevChapter = activeIdx > 0 ? course.chapters[activeIdx - 1] : null
  const nextChapter = activeIdx < course.chapters.length - 1 ? course.chapters[activeIdx + 1] : null

  const completedPct = progress?.percentage ?? 0
  const completedIds = new Set(
    course.chapters
      .slice(0, Math.floor((completedPct / 100) * course.chapters.length))
      .map(c => c.id)
  )

  const notes = activeChapter
    ? await prisma.note.findMany({
        where: { userId: session.userId, chapterId: activeChapter.id },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div className="app-shell">
      <Sidebar active="lesson" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher dans la transcription…" initials={user.initials} />
        <div className="app-body">
          {/* TOC */}
          <div className="toc">
            <div className="toc-course">{course.parcours} · {course.chapters.length} chapitres</div>
            {course.chapters.map(ch => {
              const isDone = completedIds.has(ch.id)
              const isActive = ch.id === activeChapter?.id
              const cls = isDone ? 'done' : isActive ? 'active' : 'upcoming'
              return (
                <Link
                  key={ch.id}
                  href={`/cours/${slug}?ch=${ch.id}`}
                  className={`toc-ch ${cls}`}
                >
                  <div className="toc-ch-title">{ch.order} — {ch.title}</div>
                  <div className="toc-ch-meta">
                    {isDone && <span className="ch-check">✓</span>}
                    {ch.duration} min · {ch.format}
                    {isActive && ' · en cours'}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Lesson center */}
          <div className="lesson-center">
            <div className="breadcrumb">
              <Link href="/dashboard">Tableau de bord</Link>
              <span className="bc-sep">›</span>
              <span>{course.parcours}</span>
              <span className="bc-sep">›</span>
              <span>Chapitre {activeChapter?.order}</span>
            </div>

            <h2 className="lesson-title">{activeChapter?.title}</h2>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              par {course.speaker} · {activeChapter?.duration} min
            </div>

            {/* Player */}
            <div className="player">
              <div className="player-screen">
                <button className="play-btn" id="play-btn">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                </button>
                <div className="vid-overlay">{activeChapter?.title} — {course.parcours} · MANIA</div>
              </div>
              <div className="vid-ctrls">
                <div className="prog-row">
                  <span className="vid-time">00:00</span>
                  <div className="vid-prog"><div className="vid-prog-fill" style={{ width: '0%' }}></div></div>
                  <span className="vid-time">{activeChapter?.duration}:00</span>
                </div>
                <div className="ctrl-row">
                  <button className="c-btn">−10s</button>
                  <button className="c-btn">+10s</button>
                  <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }}></div>
                  <button className="c-btn sp-btn">0.75×</button>
                  <button className="c-btn sp-btn on">1×</button>
                  <button className="c-btn sp-btn">1.25×</button>
                  <button className="c-btn sp-btn">1.5×</button>
                  <button className="c-btn sp-btn">2×</button>
                  <div className="sp"></div>
                  <button className="c-btn">FR</button>
                  <button className="c-btn active">⛶</button>
                  <button className="c-btn">⧉</button>
                </div>
              </div>
            </div>

            {/* Mobile tabs */}
            <div id="m-lesson-tabs">
              <div className="mlt-inner">
                <button className="mlt-btn active">Vidéo</button>
                <button className="mlt-btn">Transcription</button>
                <button className="mlt-btn">Ressources</button>
                <button className="mlt-btn">Notes</button>
                <button className="mlt-btn">Sommaire</button>
              </div>
            </div>

            <div className="lesson-footer">
              <div className="nav-btns">
                {prevChapter ? (
                  <Link href={`/cours/${slug}?ch=${prevChapter.id}`} className="btn-ghost">← Chapitre {prevChapter.order}</Link>
                ) : (
                  <button className="btn-ghost" disabled>← Début</button>
                )}
                {nextChapter ? (
                  <Link href={`/cours/${slug}?ch=${nextChapter.id}`} className="btn-ghost">Chapitre {nextChapter.order} →</Link>
                ) : (
                  <button className="btn-ghost" disabled>Fin →</button>
                )}
              </div>
              <button className="btn-done">Marquer comme terminé</button>
            </div>
          </div>

          {/* Right panel */}
          <div className="rpanel">
            <div className="p-tabs">
              <button className="p-tab active">Transcript</button>
              <button className="p-tab">Ressources</button>
              <button className="p-tab">Notes</button>
            </div>
            <div className="p-content">
              <div className="tab-pane active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Suivre la lecture</span>
                  <button className="c-btn" style={{ fontSize: '11px', padding: '5px 10px' }}>Lire sans la vidéo</button>
                </div>
                <div className="tr-para">
                  <div className="tr-ts">00:00</div>
                  Dans ce chapitre, nous allons examiner les concepts fondamentaux abordés dans <em>{activeChapter?.title}</em>.
                </div>
                <div className="tr-para">
                  <div className="tr-ts">01:24</div>
                  La question centrale est celle de la coordination des systèmes dans des environnements institutionnels fermés.
                </div>
                <div className="tr-para cur">
                  <div className="tr-ts">04:38</div>
                  L&apos;orchestrateur joue ici un rôle clé dans la gestion des décisions et la traçabilité.
                </div>
              </div>

              <div className="tab-pane">
                <div className="res-item">
                  <div className="res-icon">PDF</div>
                  <div>
                    <div className="res-name">Cadre méthodologique — {activeChapter?.title}</div>
                    <div className="res-size">320 Ko</div>
                  </div>
                  <span className="res-dl">↓ Télécharger</span>
                </div>
                <div className="res-item">
                  <div className="res-icon">PDF</div>
                  <div>
                    <div className="res-name">Fiche de synthèse</div>
                    <div className="res-size">88 Ko</div>
                  </div>
                  <span className="res-dl">↓ Télécharger</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '16px', lineHeight: 1.5 }}>
                  Toutes les ressources sont confidentielles et réservées aux apprenants MANIA.
                </p>
              </div>

              <div className="tab-pane">
                <p className="notes-hint">Vos notes sont liées au timecode courant.</p>
                <textarea className="notes-ta" placeholder="Vos notes pour ce chapitre…">
                  {notes[0]?.content ?? ''}
                </textarea>
                <a className="notes-exp">↓ Exporter mes notes en PDF</a>
                <p className="notes-priv" style={{ marginTop: '14px' }}>Vos notes sont privées.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav active="lesson" />
    </div>
  )
}
