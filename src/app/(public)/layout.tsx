// src/app/(public)/layout.tsx
//
// Coquille PUBLIQUE partagée : landing, candidature, confidentialité,
// formation, blog, mentions légales.
//
// ℹ️ Un groupe de routes entre parenthèses n'apparaît PAS dans l'URL :
//    (public)/candidature  →  /candidature
//
// ⚠️ verifySession() N'EST PAS appelé ici (il redirigerait vers /login) :
//    ces pages restent accessibles sans connexion. On utilise getSession(),
//    qui renvoie simplement `null` si personne n'est connecté — ne jamais
//    y placer de contenu réservé pour autant.
//
// [DECISION] (2026-08-01) Depuis que la landing n'exclut plus les visiteurs
// connectés (option A, cf. (public)/page.tsx), l'accès à l'espace personnel
// se fait ici : PublicHeader reçoit le profil courant (ou null) pour afficher
// soit l'avatar de l'utilisateur (→ /dashboard), soit le bouton générique
// « Mon espace » (→ /login).

import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/db'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const user = session?.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, initials: true, photoUrl: true },
      })
    : null

  return (
    <div className="pub-shell">
      <PublicHeader user={user} />

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
                <li><Link href="/agent-ia">Agent IA</Link></li>
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
