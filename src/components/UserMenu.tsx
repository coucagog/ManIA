// src/components/UserMenu.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

type Props = {
  name: string
  initials: string
  photoUrl?: string | null
  /** Lien du premier élément — /dashboard côté public, /dashboard aussi dans l'espace. */
  accueilHref?: string
}

// Pastille d'identité + menu déroulant.
//
// ⚠️ Le DÉCLENCHEUR reproduit à l'octet près la pastille existante (mêmes
//    styles inline, mêmes dimensions) : c'est une exigence explicite, elle
//    plaît telle quelle. On n'ajoute que le chevron et le panneau.
//
// 🔴 La déconnexion vit ICI et nulle part ailleurs : elle est explicite,
//    libellée, et atteinte en deux gestes. Un avatar qui déconnecte au premier
//    clic ressemble à un badge d'identité, pas à un bouton d'action.
export default function UserMenu({ name, initials, photoUrl, accueilHref = '/dashboard' }: Props) {
  const [open, setOpen] = useState(false)
  const boite = useRef<HTMLDivElement>(null)
  const firstName = name.split(' ')[0]

  // Fermeture au clic extérieur et à Échap : sans ça, un menu ouvert suit
  // l'utilisateur sur toute la page et masque le contenu.
  useEffect(() => {
    if (!open) return
    const auClic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOpen(false)
    }
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [open])

  const avatarInner = photoUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : initials

  return (
    <div className="um" ref={boite}>
      <button
        type="button"
        className="um-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Compte de ${name}`}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '3px 10px 3px 3px',
          background: 'var(--inset)', border: '1px solid var(--border)',
          borderRadius: '999px', textDecoration: 'none', color: 'var(--fg)',
          fontSize: '13px', fontWeight: 500,
          font: 'inherit', cursor: 'pointer',
        }}
      >
        <div className="avatar" style={{
          width: '28px', height: '28px', fontSize: '11px', flexShrink: 0,
          ...(photoUrl ? { padding: 0, overflow: 'hidden' } : {}),
        }}>
          {avatarInner}
        </div>
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {firstName}
        </span>
        <svg
          className={`um-chev${open ? ' is-open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="um-panel" role="menu">
          <p className="um-qui">
            <span className="um-qui-nom">{name}</span>
          </p>

          <Link href={accueilHref} className="um-item" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Tableau de bord
          </Link>

          <Link href="/profil" className="um-item" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.5 20c0-3.6 3.2-6.2 7.5-6.2s7.5 2.6 7.5 6.2" />
            </svg>
            Mon profil
          </Link>

          <span className="um-sep" aria-hidden="true" />

          <form action={logout}>
            <button type="submit" className="um-item um-item--sortie" role="menuitem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 17l5-5-5-5" />
                <path d="M20 12H9" />
                <path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
              </svg>
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
