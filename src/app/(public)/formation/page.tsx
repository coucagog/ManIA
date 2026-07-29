import Link from 'next/link'

export const metadata = { title: 'Formation — MANIA' }

export default function FormationPage() {
  return (
    <div className="pub-page">
      <p className="pub-date">Bientôt disponible</p>
      <h1>Formation aux agents IA</h1>
      <p>
        Notre plateforme de formation aux bonnes pratiques des LLM et des agents
        arrive prochainement. En attendant, vous pouvez{' '}
        <Link href="/candidature">demander un agent IA</Link> configuré pour votre activité.
      </p>
    </div>
  )
}