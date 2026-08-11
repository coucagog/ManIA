import SearchInput from '@/components/SearchInput'
import UserMenu from '@/components/UserMenu'

type Props = { placeholder?: string; initials: string; name: string; photoUrl?: string | null }

// La pastille d'identité ouvre désormais le menu du compte au lieu de mener
// tout droit à /profil. C'est le seul élément présent sur TOUTES les pages de
// l'espace et à TOUTES les tailles d'écran (la barre latérale disparaît sous
// 768 px) : c'est donc le seul endroit où la déconnexion et les liens publics
// sont toujours atteignables. Son habillage ne change pas — le déclencheur de
// UserMenu reproduit la pastille à l'octet près, chevron en plus.
export default function Topbar({ placeholder = 'Rechercher…', initials, name, photoUrl }: Props) {
  return (
    <header className="topbar">
      <SearchInput placeholder={placeholder} />
      <div className="tb-actions">
        <button className="bell">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="bell-dot"></span>
        </button>
        <UserMenu name={name} initials={initials} photoUrl={photoUrl} variant="app" />
      </div>
    </header>
  )
}
