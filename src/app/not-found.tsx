import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: 'center', gap: '24px' }}>
        <div className="logo">
          <span className="man">MAN</span><span className="ia">IA</span>
        </div>
        <div>
          <p style={{ fontSize: '56px', fontFamily: 'var(--serif)', fontWeight: 300, color: 'var(--muted)', lineHeight: 1 }}>404</p>
          <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '14px' }}>Cette page n&apos;existe pas.</p>
        </div>
        <Link href="/dashboard" className="btn-primary" style={{ textAlign: 'center' }}>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
