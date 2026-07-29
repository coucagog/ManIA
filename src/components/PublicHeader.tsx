// src/components/PublicHeader.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PublicHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const close = () => setOpen(false)

  return (
    <header className="pub-hd">
      <div className="pub-hd-bar">
        <Link href="/" className="pub-hd-logo" aria-label="MANIA — accueil" onClick={close}>
          <span>MAN</span><span className="ia">IA</span>
        </Link>

        {/* Nav desktop */}
        <nav className="pub-hd-nav">
          <Link href="/candidature" className={`pub-hd-item${isActive('/candidature') ? ' is-active' : ''}`}>
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

          <Link href="/login" className="pub-hd-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mon espace
          </Link>
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
          <Link href="/candidature" className="pub-hd-pitem" onClick={close}>
            <span className="pub-hd-ico pub-hd-ico--coral" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="pub-hd-lbl">Agent IA<span className="pub-hd-sub">Agents métier configurés pour votre activité</span></span>
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

          <Link href="/login" className="pub-hd-cta pub-hd-cta--full" onClick={close}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mon espace
          </Link>
        </div>
      )}
    </header>
  )
}
