import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import PasswordForm from '@/app/profil/PasswordForm'
import ProfileForm from '@/app/profil/ProfileForm'

function roleBadge(role: string) {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrateur', color: 'var(--coral)' },
    user: { label: 'Apprenant', color: 'var(--accent, #4f7ef8)' },
  }
  return map[role] ?? { label: role, color: 'var(--muted)' }
}

function fmtDate(d: Date | string) {
  return new Date(d as unknown as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ProfilPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const [totalProgress, completedCourses, notesCount, chaptersCount] = await Promise.all([
    prisma.progress.count({ where: { userId: session.userId, percentage: { gt: 0 } } }),
    prisma.progress.count({ where: { userId: session.userId, percentage: 100 } }),
    prisma.note.count({ where: { userId: session.userId } }),
    prisma.note.findMany({ where: { userId: session.userId }, select: { chapterId: true }, distinct: ['chapterId'] }).then(r => r.length),
  ])

  const badge = roleBadge(user.role)

  return (
    <div className="app-shell">
      <Sidebar active="profil" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
      <div className="main">
        <Topbar placeholder="Rechercher…" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
        <div className="page">

          {/* Hero */}
          <div className="sec-card" style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
              background: user.photoUrl ? 'transparent' : 'var(--coral)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 700, color: 'white',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            }}>
              {user.photoUrl
                ? <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.initials}
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>{user.name}</h1>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>{user.email}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: `${badge.color}18`, color: badge.color,
                  fontSize: '11px', fontWeight: 600, letterSpacing: '.05em',
                  padding: '3px 10px', borderRadius: '20px',
                }}>
                  {badge.label}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Membre depuis le {fmtDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {[
              { value: totalProgress, label: 'cours commencés' },
              { value: completedCourses, label: 'cours terminés' },
              { value: chaptersCount, label: 'chapitres vus' },
              { value: notesCount, label: 'notes prises' },
            ].map(({ value, label }) => (
              <div key={label} className="sec-card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                <div style={{ fontSize: '36px', fontFamily: 'var(--serif)', color: 'var(--coral)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Edit forms */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="sec-card">
              <span className="sec-label">Modifier le profil</span>
              <ProfileForm name={user.name} photoUrl={user.photoUrl} />
            </div>
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
