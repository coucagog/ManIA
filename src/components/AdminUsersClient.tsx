'use client'

import { useState } from 'react'
import Link from 'next/link'

type UserRow = {
  id: string; name: string; email: string; role: string
  initials: string; createdAt: string; courseCount: number
}

export default function AdminUsersClient({ users }: { users: UserRow[] }) {
  const [q, setQ] = useState('')
  const filtered = users.filter(u =>
    !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <input
          className="f-in"
          type="text"
          placeholder="Rechercher par nom ou email…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: '320px', fontSize: '13px' }}
        />
      </div>
      <div className="activity-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              {['Utilisateur', 'Email', 'Rôle', 'Cours', 'Inscrit le', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--muted)', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--coral)', fontWeight: 600, flexShrink: 0 }}>{u.initials}</div>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '11px', background: u.role === 'admin' ? 'var(--coral)' : 'var(--inset)', color: u.role === 'admin' ? 'white' : 'var(--muted)', borderRadius: '4px', padding: '2px 7px' }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.courseCount}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>{u.createdAt}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Link href={`/admin/users/${u.id}`} style={{ fontSize: '12px', color: 'var(--coral)' }}>Modifier</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '24px 16px', color: 'var(--muted)', textAlign: 'center', fontSize: '13px' }}>Aucun résultat</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
