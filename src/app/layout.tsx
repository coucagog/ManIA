import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MANIA — Espace Apprenant',
  description: "Plateforme d'apprentissage MANIA pour agents institutionnels.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'light')}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
