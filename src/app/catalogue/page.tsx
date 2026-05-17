import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import CatalogueContent, { CourseItem } from '@/components/CatalogueContent'

export default async function CataloguePage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: { progress: { where: { userId: session.userId } } },
  })

  const items: CourseItem[] = courses.map(c => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    speaker: c.speaker,
    parcours: c.parcours,
    format: c.format,
    duration: c.duration,
    level: c.level,
    thumbClass: c.thumbClass,
    progress: c.progress[0]?.percentage ?? 0,
  }))

  const parcoursOptions = [...new Set(items.map(c => c.parcours))]
  const formatOptions = [...new Set(items.map(c => c.format))]
  const levelOptions = [...new Set(items.map(c => c.level))]

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
          <CatalogueContent
            courses={items}
            parcoursOptions={parcoursOptions}
            formatOptions={formatOptions}
            levelOptions={levelOptions}
          />
        </div>
      </div>
      <MobileNav active="catalog" />
    </div>
  )
}
