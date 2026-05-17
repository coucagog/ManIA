import Link from 'next/link'

type Props = { active: 'dashboard' | 'lesson' | 'catalog' | 'profil' | 'other' }

export default function MobileNav({ active }: Props) {
  return (
    <nav id="mobile-bar">
      <Link href="/dashboard" className={`mb-btn${active === 'dashboard' ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
        Accueil<span className="mb-pip"></span>
      </Link>
      <Link href="/cours" className={`mb-btn${active === 'lesson' ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
        Cours<span className="mb-pip"></span>
      </Link>
      <Link href="/catalogue" className={`mb-btn${active === 'catalog' ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
        Catalogue<span className="mb-pip"></span>
      </Link>
      <Link href="/profil" className={`mb-btn${active === 'profil' ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
        Profil<span className="mb-pip"></span>
      </Link>
    </nav>
  )
}
