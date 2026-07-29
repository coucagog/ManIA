import Link from 'next/link'

export const metadata = { title: 'Mentions légales — MANIA' }

export default function MentionsLegalesPage() {
  return (
    <div className="pub-page">
      <p className="pub-date">Bientôt disponible</p>
      <h1>Mentions légales</h1>
      <p>
        Les mentions légales complètes de MANIA (éditeur, hébergeur, responsable de
        publication) seront publiées ici prochainement. Pour toute question, écrivez
        à contact@mania.sn. Voir aussi notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </div>
  )
}