import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'

function fmt(d: Date | string) {
  const date = new Date(d as unknown as string)
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtShort(d: Date | string) {
  const date = new Date(d as unknown as string)
  return { day: date.toLocaleDateString('fr-FR', { day: '2-digit' }), month: date.toLocaleDateString('fr-FR', { month: 'short' }), year: date.getFullYear() }
}
function fmtTime(d: Date | string) {
  return new Date(d as unknown as string).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default async function PresentielPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const all = await prisma.session.findMany({ orderBy: { date: 'asc' } })
  const now = new Date()
  const upcoming = all.filter(s => s.status !== 'cancelled' && new Date(s.date as unknown as string) >= now)
  const past = all.filter(s => s.status === 'past' || new Date(s.date as unknown as string) < now).reverse()

  return (
    <div className="app-shell">
      <Sidebar active="presentiel" initials={user.initials} />
      <div className="main">
        <Topbar placeholder="Rechercher une session…" initials={user.initials} />
        <div className="page">

          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>Sessions en Présentiel</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '540px', lineHeight: 1.6 }}>
              Formations intensives, ateliers pratiques et rencontres avec les experts MANIA. Retrouvez ci-dessous les prochaines sessions ouvertes.
            </p>
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 ? (
            <section style={{ marginBottom: '48px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>À venir</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {upcoming.map(s => {
                  const d = fmtShort(s.date)
                  return (
                    <div key={s.id} className="sec-card" style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '20px', alignItems: 'start' }}>
                      {/* Date block */}
                      <div style={{ background: 'var(--coral)', borderRadius: 'var(--r-sm)', padding: '10px 0', textAlign: 'center', color: 'white', flexShrink: 0 }}>
                        <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>{d.day}</div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '2px' }}>{d.month}</div>
                        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '1px' }}>{d.year}</div>
                      </div>
                      {/* Info */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{s.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                          par {s.instructor}
                        </div>
                        {s.description && (
                          <div style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6, marginBottom: '8px' }}>{s.description}</div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
                          <span>📍 {s.location}{s.address ? ` — ${s.address}` : ''}</span>
                          <span>🕐 {fmtTime(s.date)}{s.endDate ? ` – ${fmtTime(s.endDate)}` : ''}</span>
                          {s.maxSeats && <span>👥 {s.maxSeats} places</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="sec-card" style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              Aucune session programmée pour le moment. Revenez bientôt.
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Sessions passées</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {past.map(s => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '16px', alignItems: 'center', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', opacity: 0.7 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--muted)', lineHeight: 1 }}>{fmtShort(s.date).day}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>{fmtShort(s.date).month} {fmtShort(s.date).year}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{s.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.location} · {s.instructor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
      <MobileNav active="other" />
    </div>
  )
}
