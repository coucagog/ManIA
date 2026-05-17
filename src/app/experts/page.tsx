import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'

export default async function ExpertsPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  return (
    <div className="app-shell">
      <Sidebar active="experts" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher un expert…" initials={user.initials} />
        <div className="page">
          <h1 style={{ fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>Experts</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>L&apos;annuaire des intervenants sera disponible ici.</p>
        </div>
      </div>
      <MobileNav active="other" />
    </div>
  )
}
