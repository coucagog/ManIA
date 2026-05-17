import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import PasswordForm from '@/app/profil/PasswordForm'

export default async function ProfilPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const totalProgress = await prisma.progress.count({ where: { userId: session.userId, percentage: { gt: 0 } } })
  const completedCourses = await prisma.progress.count({ where: { userId: session.userId, percentage: 100 } })

  return (
    <div className="app-shell">
      <Sidebar active="profil" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher…" initials={user.initials} />
        <div className="page">
          <h1 className="cat-title" style={{ marginBottom: '28px' }}>Mon profil</h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

            {/* Identity card */}
            <div className="sec-card" style={{ gap: '20px' }}>
              <span className="sec-label">Identité</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div className="avatar" style={{ width: '54px', height: '54px', fontSize: '18px', flexShrink: 0 }}>
                  {user.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '16px' }}>{user.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>{user.email}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', textTransform: 'capitalize' }}>
                    Rôle : {user.role}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="sec-card" style={{ gap: '16px' }}>
              <span className="sec-label">Statistiques</span>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontFamily: 'var(--serif)', color: 'var(--coral)' }}>{totalProgress}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>cours commencés</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontFamily: 'var(--serif)', color: 'var(--coral)' }}>{completedCourses}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>cours terminés</div>
                </div>
              </div>
            </div>

          </div>

          {/* Password change */}
          <div style={{ marginTop: '20px', maxWidth: '400px' }}>
            <div className="sec-card">
              <span className="sec-label">Changer le mot de passe</span>
              <PasswordForm />
            </div>
          </div>
        </div>
      </div>
      <MobileNav active="profil" />
    </div>
  )
}
