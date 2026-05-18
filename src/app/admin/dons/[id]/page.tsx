import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDonationForm from '@/components/AdminDonationForm'
import Link from 'next/link'

export default async function EditDonationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  const { id } = await params
  const [admin, method] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.donationMethod.findUnique({ where: { id } }),
  ])
  if (!admin) return null
  if (!method) notFound()

  return (
    <div className="app-shell">
      <AdminSidebar active="dons" initials={admin.initials} />
      <div className="main">
        <div className="page" style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/admin/dons" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Dons</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{method.name}</h1>
          </div>
          <AdminDonationForm
            mode="edit"
            method={{
              id: method.id, name: method.name, phone: method.phone,
              qrUrl: method.qrUrl, description: method.description,
              active: method.active, order: method.order,
            }}
          />
        </div>
      </div>
    </div>
  )
}
