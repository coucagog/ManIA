import Link from 'next/link'
import { logout } from '@/app/actions/auth'

type Active = 'dashboard' | 'users' | 'cours' | 'other'
type Props = { active: Active; initials: string }

export default function AdminSidebar({ active, initials }: Props) {
  return (
    <aside className="sidebar">
      <div className="sb-logo"><span className="man">M</span><span className="ia">IA</span></div>
      <nav className="sb-nav">
        <Link href="/admin" className={`nav-btn${active === 'dashboard' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>
          </svg>
          Admin
        </Link>
        <Link href="/admin/users" className={`nav-btn${active === 'users' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
          </svg>
          Utilisateurs
        </Link>
        <Link href="/admin/cours" className={`nav-btn${active === 'cours' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Cours
        </Link>
        <Link href="/dashboard" className="nav-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Espace apprenant
        </Link>
      </nav>
      <div className="sb-bot">
        <form action={logout}>
          <button type="submit" className="avatar" title="Se déconnecter">{initials}</button>
        </form>
      </div>
    </aside>
  )
}
