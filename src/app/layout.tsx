import type { Metadata } from 'next'
import './globals.css'
import TweaksPanel from '@/components/TweaksPanel'

export const metadata: Metadata = {
  title: 'MANIA — Espace Apprenant',
  description: "Plateforme d'apprentissage MANIA pour agents institutionnels.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'light')}catch(e){}" }} />
        <style id="tweak-overrides" />
      </head>
      <body>
        {children}
        <TweaksPanel />
      </body>
    </html>
  )
}
