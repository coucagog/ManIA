'use client'

import { useActionState, useRef } from 'react'
import { updateProfile } from '@/app/actions/account'

export default function ProfileForm({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !photoRef.current) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      photoRef.current.value = data.url
    }
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <div className="f-label" style={{ marginBottom: '6px' }}>Nom complet</div>
        <input className="f-in" type="text" name="name" defaultValue={name} required minLength={2} />
      </div>
      <div>
        <div className="f-label" style={{ marginBottom: '6px' }}>Photo de profil</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={photoRef}
            className="f-in"
            type="text"
            name="photoUrl"
            defaultValue={photoUrl ?? ''}
            placeholder="URL ou charger un fichier"
            style={{ flex: 1 }}
          />
          <label style={{
            padding: '0 14px', height: '40px', display: 'flex', alignItems: 'center',
            background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            ↑ Photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {state?.error && <p className="auth-error">{state.error}</p>}
      {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '13px' }}>✓ Profil mis à jour.</p>}

      <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: '4px' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
