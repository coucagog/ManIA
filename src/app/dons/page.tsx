import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MobileNav from '@/components/MobileNav'
import Image from 'next/image'

function serviceColor(name: string) {
  const n = name.toLowerCase()
  if (n.includes('orange')) return '#FF6600'
  if (n.includes('wave')) return '#1A73E8'
  if (n.includes('free')) return '#34A853'
  if (n.includes('mtn')) return '#FFCC00'
  if (n.includes('moov')) return '#00AADF'
  return 'var(--coral)'
}

function serviceInitial(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function DonsPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  const methods = await prisma.donationMethod.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="app-shell">
      <Sidebar active="dons" initials={user.initials} photoUrl={user.photoUrl} />
      <div className="main">
        <Topbar placeholder="Dons & soutien…" initials={user.initials} photoUrl={user.photoUrl} />
        <div className="page">

          {/* Hero */}
          <div style={{ maxWidth: '680px', marginBottom: '48px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--coral)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Soutenir MANIA</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '16px' }}>
              Votre soutien fait avancer<br />la formation en IA pour tous.
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '20px' }}>
              MANIA est une initiative bénévole dédiée à rendre l&apos;intelligence artificielle accessible aux institutions,
              aux décideurs et aux agents du service public. Chaque don, aussi modeste soit-il, nous aide à poursuivre
              cette mission d&apos;intérêt général.
            </p>

            {/* Why donate */}
            <div className="sec-card" style={{ background: 'var(--inset)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '14px' }}>Vos dons servent à</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['🖥️', 'Hébergement des serveurs', 'Maintenir opérationnelles les plateformes et solutions IA que vous utilisez au quotidien.'],
                  ['👨‍💻', 'Rémunération des techniciens', 'Valoriser le travail des développeurs et formateurs qui contribuent bénévolement à vos formations.'],
                  ['📚', 'Matériel didactique', 'Acquérir et entretenir les équipements pédagogiques — tablettes, écrans, matériel de présentation.'],
                  ['🤖', 'Abonnements IA', 'Financer les accès aux outils d\'intelligence artificielle utilisés dans nos contenus de formation.'],
                  ['🎓', 'Nouveaux contenus', 'Développer de nouveaux cours, modules et parcours pour élargir notre catalogue de formations.'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment methods */}
          {methods.length > 0 ? (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '20px' }}>Comment nous soutenir</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {methods.map(m => {
                  const color = serviceColor(m.name)
                  return (
                    <div key={m.id} className="sec-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: color, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '14px', fontWeight: 700,
                          color: 'white', flexShrink: 0, boxShadow: `0 2px 8px ${color}40`,
                        }}>
                          {serviceInitial(m.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</div>
                          {m.phone && !m.qrUrl && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Transfert mobile</div>}
                          {m.qrUrl && !m.phone && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Scanner le QR code</div>}
                          {m.qrUrl && m.phone && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Numéro ou QR code</div>}
                        </div>
                      </div>

                      {/* Phone */}
                      {m.phone && (
                        <div style={{ background: 'var(--inset)', borderRadius: 'var(--r-sm)', padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', letterSpacing: '.05em' }}>NUMÉRO</div>
                          <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '.04em', color: color }}>{m.phone}</div>
                        </div>
                      )}

                      {/* QR */}
                      {m.qrUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '.05em' }}>SCANNER LE QR CODE</div>
                          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--r-sm)', boxShadow: 'var(--neo-r-sm)' }}>
                            <Image src={m.qrUrl} alt={`QR ${m.name}`} width={160} height={160} style={{ display: 'block' }} unoptimized />
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {m.description && (
                        <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{m.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="sec-card" style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              Les moyens de paiement seront disponibles prochainement.
            </div>
          )}

          {/* Footer note */}
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--fg)' }}>Merci pour votre confiance.</strong> MANIA s&apos;engage à utiliser chaque contribution
            de façon transparente et responsable, au service exclusif de la formation et du partage des connaissances en intelligence artificielle.
            Pour toute question relative à un don, contactez-nous à l&apos;adresse de votre centre de formation.
          </div>

        </div>
      </div>
      <MobileNav active="other" />
    </div>
  )
}
