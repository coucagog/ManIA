// src/components/PublicHeader.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserMenu from '@/components/UserMenu'
import { logout } from '@/app/actions/auth'

type PublicUser = { name: string; initials: string; photoUrl: string | null } | null

// « Mon espace » sert deux publics :
// - visiteur non connecté → bouton corail « Mon espace » vers /login ;
// - déjà authentifié → RÉPLIQUE TEL QUEL le motif du Topbar de l'espace
//   apprenant (pilule .avatar 28px + prénom) : mêmes styles inline, à
//   l'octet près, seul le lien change (/dashboard, pas /profil).
export default function PublicHeader({ user }: { user: PublicUser }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  // « Agent IA » couvre la page produit ET l'étape de candidature : l'onglet
  // reste allumé pendant que le visiteur remplit le formulaire, pour qu'il
  // sache où il se trouve dans le parcours.
  const isActiveAny = (...hrefs: string[]) => hrefs.some(isActive)
  const close = () => setOpen(false)
  // ℹ️ Le prénom n'est plus calculé ici : UserMenu s'en charge côté bureau, et
  //    le panneau mobile affiche le nom complet.
  const avatarInner = user?.photoUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : user?.initials

  return (
    <header className="pub-hd">
      <div className="pub-hd-bar">
        <Link href="/" className="pub-hd-logo" aria-label="MANIA — accueil" onClick={close}>
          <span>MAN</span><span className="ia">IA</span>
        </Link>

        {/* Nav desktop */}
        <nav className="pub-hd-nav">
          <Link href="/agent-ia" className={`pub-hd-item${isActiveAny('/agent-ia', '/candidature') ? ' is-active' : ''}`}>
            <span className="pub-hd-ico pub-hd-ico--coral" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="pub-hd-lbl">Agent IA<span className="pub-hd-sub">Agents métier</span></span>
          </Link>

          <Link href="/formation" className={`pub-hd-item${isActive('/formation') ? ' is-active' : ''}`}>
            <span className="pub-hd-ico pub-hd-ico--fg" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="13" y2="16" />
              </svg>
            </span>
            <span className="pub-hd-lbl">Formation<span className="pub-hd-sub">Bonnes pratiques LLM</span></span>
          </Link>

          <Link href="/blog" className={`pub-hd-blog${isActive('/blog') ? ' is-active' : ''}`}>Blog</Link>

          <span className="pub-hd-sep" aria-hidden="true" />

          {user ? (
            // La pastille devient le déclencheur d'un menu (Tableau de bord ·
            // Mon profil · Se déconnecter). Son habillage est inchangé.
            <UserMenu name={user.name} initials={user.initials} photoUrl={user.photoUrl} />
          ) : (
            <Link href="/login" className="pub-hd-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mon espace
            </Link>
          )}
        </nav>

        {/* Burger mobile */}
        <button
          type="button"
          className="pub-hd-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      {/* Panneau mobile */}
      {open && (
        <div className="pub-hd-panel">
          <Link href="/agent-ia" className="pub-hd-pitem" onClick={close}>
            <span className="pub-hd-ico pub-hd-ico--coral" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="pub-hd-lbl">Agent IA<span className="pub-hd-sub">Agents métier, offres et tarifs</span></span>
          </Link>

          <Link href="/formation" className="pub-hd-pitem" onClick={close}>
            <span className="pub-hd-ico pub-hd-ico--fg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="13" y2="16" />
              </svg>
            </span>
            <span className="pub-hd-lbl">Formation<span className="pub-hd-sub">Bonnes pratiques des LLM et des agents</span></span>
          </Link>

          <Link href="/blog" className="pub-hd-pblog" onClick={close}>Blog</Link>

          {user ? (
            // Sur mobile, pas de déroulante : le panneau est déjà un menu, on
            // y déplie les entrées à plat plutôt que d'imbriquer un second cran.
            <>
              <Link href="/dashboard" className="pub-hd-pitem" onClick={close}>
                <span
                  className="avatar"
                  aria-hidden="true"
                  style={user.photoUrl ? { padding: 0, overflow: 'hidden' } : undefined}
                >
                  {avatarInner}
                </span>
                <span className="pub-hd-lbl">Tableau de bord<span className="pub-hd-sub">{user.name}</span></span>
              </Link>
              <Link href="/profil" className="pub-hd-pblog" onClick={close}>Mon profil</Link>
              <form action={logout}>
                <button type="submit" className="pub-hd-pblog" style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="pub-hd-cta pub-hd-cta--full" onClick={close}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mon espace
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
