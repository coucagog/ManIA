import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'

type Props = { active: 'dashboard' | 'lesson' | 'catalog' | 'profil' | 'other'; initials: string }

export default function Sidebar({ active, initials }: Props) {
  return (
    <aside className="sidebar">
      <div className="sb-logo"><span className="man">M</span><span className="ia">IA</span></div>
      <nav className="sb-nav">
        <Link href="/dashboard" className={`nav-btn${active === 'dashboard' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
          Accueil
        </Link>
        <Link href="/cours" className={`nav-btn${active === 'lesson' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
          Mes cours
        </Link>
        <Link href="/catalogue" className={`nav-btn${active === 'catalog' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
          Catalogue
        </Link>
        <Link href="/profil" className={`nav-btn${active === 'profil' ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
          Profil
        </Link>
      </nav>
      <div className="sb-bot">
        <ThemeToggle />
        <form action={logout}>
          <button type="submit" className="avatar" title="Se déconnecter">{initials}</button>
        </form>
      </div>
    </aside>
  )
}
