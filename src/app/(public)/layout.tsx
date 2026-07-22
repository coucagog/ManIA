// src/app/(public)/layout.tsx
//
// Coquille PUBLIQUE partagée : candidature, politique de confidentialité,
// et plus tard la landing page et le blog.
//
// ℹ️ Un groupe de routes entre parenthèses n'apparaît PAS dans l'URL :
//    (public)/candidature  →  /candidature
//
// ⚠️ Aucun appel à verifySession() ici : ces pages sont publiques par nature.
//    Ne jamais y placer de contenu réservé.

import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pub-shell">
      <header className="pub-header">
        <Link href="/" className="pub-logo" aria-label="MANIA — accueil">
          <span className="man">MAN</span><span className="ia">IA</span>
        </Link>

        <nav className="pub-nav">
          {/* Les deux offres sont volontairement SÉPARÉES : un ophtalmologue
              venu pour un agent ne doit pas croire qu'on lui vend des cours. */}
          <Link href="/candidature">Agent IA</Link>
          <Link href="/login" className="pub-nav-cta">Mon espace</Link>
        </nav>
      </header>

      <main className="pub-main">{children}</main>

      <footer className="pub-footer">
        <div className="pub-footer-links">
          <Link href="/confidentialite">Confidentialité</Link>
          <a href="mailto:contact@mania.sn">contact@mania.sn</a>
        </div>
        <p className="pub-footer-note">
          MANIA — Dakar, Sénégal. Données traitées conformément à la loi n°2008-12.
        </p>
      </footer>
    </div>
  )
}
