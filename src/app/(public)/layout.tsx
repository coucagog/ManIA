// src/app/(public)/layout.tsx
//
// Coquille PUBLIQUE partagée : candidature, confidentialité, formation, blog,
// mentions légales, et bientôt la landing.
//
// ℹ️ Un groupe de routes entre parenthèses n'apparaît PAS dans l'URL :
//    (public)/candidature  →  /candidature
//
// ⚠️ Aucun appel à verifySession() ici : ces pages sont publiques par nature.
//    Ne jamais y placer de contenu réservé.

import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pub-shell">
      <PublicHeader />

      <main className="pub-main">{children}</main>

      <footer className="pub-ft">
        <div className="pub-ft-card">
          <div className="pub-ft-top">
            <div className="pub-ft-brand">
              <Link href="/" className="pub-ft-logo" aria-label="MANIA — accueil">
                <span>MAN</span><span className="ia">IA</span>
              </Link>
              <p className="pub-ft-tag">
                Agents IA métier et formation aux bonnes pratiques des LLM.
                Conçu à Dakar pour les professionnels exigeants.
              </p>
            </div>

            <div className="pub-ft-col">
              <h3>Offres</h3>
              <ul>
                <li><Link href="/candidature">Agent IA</Link></li>
                <li><Link href="/formation">Formation</Link></li>
                <li><Link href="/blog">Blog</Link></li>
              </ul>
            </div>

            <div className="pub-ft-col">
              <h3>Contact</h3>
              <ul>
                <li><a href="mailto:contact@mania.sn">contact@mania.sn</a></li>
                <li><Link href="/login">Mon espace</Link></li>
              </ul>
            </div>
          </div>

          <div className="pub-ft-div" aria-hidden="true" />

          <div className="pub-ft-bottom">
            <p className="pub-ft-note">
              MANIA — Dakar, Sénégal. Données traitées conformément à la loi n°2008-12.
            </p>
            <nav className="pub-ft-legal">
              <Link href="/confidentialite">Confidentialité</Link>
              <span aria-hidden="true">·</span>
              <Link href="/mentions-legales">Mentions légales</Link>
              <span aria-hidden="true">·</span>
              <a href="mailto:contact@mania.sn">contact@mania.sn</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
