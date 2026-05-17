import SearchInput from '@/components/SearchInput'

type Props = { placeholder?: string; initials: string }

export default function Topbar({ placeholder = 'Rechercher…', initials }: Props) {
  return (
    <header className="topbar">
      <SearchInput placeholder={placeholder} />
      <div className="tb-actions">
        <button className="bell">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="bell-dot"></span>
        </button>
        <div className="avatar">{initials}</div>
      </div>
    </header>
  )
}
