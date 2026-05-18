import Link from 'next/link'
import SearchInput from '@/components/SearchInput'

type Props = { placeholder?: string; initials: string; name: string; photoUrl?: string | null }

export default function Topbar({ placeholder = 'Rechercher…', initials, name, photoUrl }: Props) {
  const firstName = name.split(' ')[0]

  return (
    <header className="topbar">
      <SearchInput placeholder={placeholder} />
      <div className="tb-actions">
        <button className="bell">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="bell-dot"></span>
        </button>
        <Link href="/profil" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: photoUrl ? '3px 12px 3px 3px' : '3px 12px 3px 3px',
          background: 'var(--inset)', border: '1px solid var(--border)',
          borderRadius: '999px', textDecoration: 'none', color: 'var(--fg)',
          fontSize: '13px', fontWeight: 500,
        }}>
          <div className="avatar" style={{
            width: '28px', height: '28px', fontSize: '11px', flexShrink: 0,
            ...(photoUrl ? { padding: 0, overflow: 'hidden' } : {}),
          }}>
            {photoUrl
              ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firstName}
          </span>
        </Link>
      </div>
    </header>
  )
}
