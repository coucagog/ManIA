import Link from 'next/link'

export const metadata = { title: 'Blog — MANIA' }

export default function BlogPage() {
  return (
    <div className="pub-page">
      <p className="pub-date">Bientôt disponible</p>
      <h1>Blog</h1>
      <p>
        Nos articles sur l&apos;IA au service des professionnels arrivent bientôt.
        En attendant, <Link href="/candidature">demandez un agent IA</Link> pour votre activité.
      </p>
    </div>
  )
}