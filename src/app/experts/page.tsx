import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Link from 'next/link'

export default async function ExpertsPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const [experts, courses] = await Promise.all([
    prisma.expert.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.course.findMany({ select: { id: true, slug: true, title: true, speaker: true, parcours: true } }),
  ])

  return (
    <div className="app-shell">
      <Sidebar active="experts" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
      <div className="main">
        <Topbar placeholder="Rechercher un expert…" initials={user.initials} name={user.name} photoUrl={user.photoUrl} />
        <div className="page">

          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>Nos Experts</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '540px', lineHeight: 1.6 }}>
              Chercheurs, praticiens et formateurs qui contribuent à la mission MANIA : rendre l'intelligence artificielle accessible aux institutions et aux décideurs.
            </p>
          </div>

          {experts.length === 0 ? (
            <div className="sec-card" style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              L&apos;annuaire des experts sera disponible prochainement.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {experts.map(e => {
                const linked = e.speakerKey
                  ? courses.filter(c => c.speaker === e.speakerKey)
                  : courses.filter(c => c.speaker === e.name)
                const initials = e.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

                return (
                  <div key={e.id} className="sec-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      {e.photoUrl ? (
                        <img src={e.photoUrl} alt={e.name} style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: 'var(--neo-r-sm)' }} />
                      ) : (
                        <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--inset)', boxShadow: 'var(--neo-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: 'var(--coral)', flexShrink: 0 }}>
                          {initials}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{e.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--coral)' }}>{e.title}</div>
                        {e.institution && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>{e.institution}</div>}
                      </div>
                    </div>

                    {/* Bio */}
                    {e.bio && (
                      <p style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.65, margin: 0 }}>{e.bio}</p>
                    )}

                    {/* Linked courses */}
                    {linked.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Cours dispensés</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {linked.map(c => (
                            <Link key={c.id} href={`/cours/${c.slug}`} style={{ fontSize: '12px', color: 'var(--fg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>
                              <span style={{ flex: 1, marginRight: '8px' }}>{c.title}</span>
                              <span style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{c.parcours}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <MobileNav active="other" />
    </div>
  )
}
