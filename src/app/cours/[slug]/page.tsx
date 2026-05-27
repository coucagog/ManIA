import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import LessonPanel from '@/components/LessonPanel'
import VideoPlayer from '@/components/VideoPlayer'
import Link from 'next/link'
import { markChapterDone } from '@/app/actions/progress'

export default async function CoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ch?: string }>
}) {
  const { slug } = await params
  const { ch } = await searchParams

  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { chapters: { include: { resources: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
  })
  if (!course) notFound()

  const progress = await prisma.progress.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId: course.id } },
  })

  // Active chapter: URL param > last seen > first
  const activeChapterId =
    (ch && course.chapters.find(c => c.id === ch) ? ch : null) ??
    progress?.lastChapterId ??
    course.chapters[0]?.id

  const activeChapter = course.chapters.find(c => c.id === activeChapterId) ?? course.chapters[0]
  const activeIdx = course.chapters.findIndex(c => c.id === activeChapter?.id)
  const prevChapter = activeIdx > 0 ? course.chapters[activeIdx - 1] : null
  const nextChapter = activeIdx < course.chapters.length - 1 ? course.chapters[activeIdx + 1] : null

  const completedPct = progress?.percentage ?? 0
  const completedCount = Math.round((completedPct / 100) * course.chapters.length)
  const completedIds = new Set(course.chapters.slice(0, completedCount).map(c => c.id))
  const isCurrentDone = completedIds.has(activeChapter?.id ?? '')

  const notes = activeChapter
    ? await prisma.note.findMany({
        where: { userId: session.userId, chapterId: activeChapter.id },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div className="app-shell">
      <Sidebar active="lesson" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
      <div className="main">
        <Topbar placeholder="Rechercher dans la transcription…" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
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
            <VideoPlayer url={activeChapter?.videoUrl ?? null} title={`${activeChapter?.title ?? ''} — ${course.parcours} · MANIA`} />

            {/* Mobile tabs — filled by LessonPanel via React portal */}
            <div id="m-lesson-tabs">
              <div id="m-lesson-tabs-container"></div>
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

              {!isCurrentDone && activeChapter && (
                <form action={markChapterDone}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="chapterId" value={activeChapter.id} />
                  <input type="hidden" name="chapterOrder" value={activeChapter.order} />
                  <input type="hidden" name="totalChapters" value={course.chapters.length} />
                  <input type="hidden" name="nextChapterId" value={nextChapter?.id ?? ''} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="btn-done">Marquer comme terminé</button>
                </form>
              )}
              {isCurrentDone && (
                <span className="btn-done" style={{ opacity: 0.5, cursor: 'default' }}>✓ Chapitre terminé</span>
              )}
            </div>
          </div>

          {/* Right panel — client component for tab switching + notes */}
          {activeChapter && (
            <LessonPanel
              noteContent={notes[0]?.content ?? ''}
              chapterId={activeChapter.id}
              slug={slug}
              chapterTitle={activeChapter.title}
              content={activeChapter.content ?? null}
              resources={activeChapter.resources}
            />
          )}
        </div>
      </div>
      <MobileNav active="lesson" />
    </div>
  )
}
