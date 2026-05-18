import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import Link from 'next/link'

export default async function AdminDonsPage() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin) return null

  const methods = await prisma.donationMethod.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] })

  return (
    <div className="app-shell">
      <AdminSidebar active="dons" initials={admin.initials} />
      <div className="main">
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '2px' }}>Moyens de don</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{methods.length} moyen{methods.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/admin/dons/new" className="btn-done" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '13px' }}>+ Nouveau</Link>
          </div>
          <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Service', 'Numéro', 'QR', 'Ordre', 'Statut', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {methods.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>{m.phone ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>{m.qrUrl ? '✓' : '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{m.order}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: m.active ? 'rgba(var(--coral-rgb,220,80,60),0.1)' : 'var(--inset)', color: m.active ? 'var(--coral)' : 'var(--muted)' }}>
                        {m.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/dons/${m.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                    </td>
                  </tr>
                ))}
                {methods.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px 16px', color: 'var(--muted)', textAlign: 'center' }}>
                    Aucun moyen de don. <Link href="/admin/dons/new" style={{ color: 'var(--coral)' }}>Ajouter le premier</Link>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
