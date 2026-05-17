import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'

export default async function PresentielPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  return (
    <div className="app-shell">
      <Sidebar active="presentiel" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher une session…" initials={user.initials} />
        <div className="page">
          <h1 style={{ fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>Présentiel</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Les sessions en présentiel seront disponibles ici.</p>
        </div>
      </div>
      <MobileNav active="other" />
    </div>
  )
}
