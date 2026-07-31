// src/components/ArticleImageUpload.tsx
//
// Champ « Image » de l'article de blog : clic pour choisir un fichier plutôt
// qu'une URL à taper à la main. Même patron que SessionMediaUpload, réduit à
// l'image seule.
//
// Pourquoi ce champ existait en URL texte à l'origine : l'admin devait déjà
// avoir déposé le fichier dans public/uploads (à la main, ou via un autre
// upload) puis en copier le chemin. Piège en production : public/uploads est
// un volume Docker propre à chaque environnement — un chemin saisi à la main
// depuis un test en local ne pointe vers RIEN sur le serveur de prod. Un
// upload direct écrit sur le serveur qui sert réellement la page (local OU
// prod, selon où l'admin travaille), donc le fichier existe toujours là où
// il doit être lu.
'use client'

import { useState, useRef } from 'react'

type Props = { initialUrl?: string | null }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
const HINT = 'JPG, PNG, WEBP, GIF, SVG · max 8 Mo'

export default function ArticleImageUpload({ initialUrl }: Props) {
  const [imageUrl, setImageUrl] = useState(initialUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'image')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload')
      setImageUrl(json.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload')
    }
    setUploading(false)
  }

  function handleRemove() {
    setImageUrl('')
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Champ réellement soumis avec le formulaire */}
      <input type="hidden" name="imageUrl" value={imageUrl} />

      {imageUrl ? (
        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', boxShadow: 'var(--neo-i-sm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Aperçu" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
          <button
            type="button"
            onClick={handleRemove}
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            ✕ Retirer l&apos;image (aplat généré par défaut)
          </button>
        </div>
      ) : (
        <label
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '24px 16px', background: 'var(--bg)', borderRadius: '10px',
            boxShadow: 'var(--neo-i-sm)', cursor: uploading ? 'wait' : 'pointer', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '28px' }}>{uploading ? '⏳' : '🖼'}</span>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {uploading ? 'Upload en cours…' : 'Cliquer pour choisir une image'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{HINT}</span>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {error && <p style={{ fontSize: '12px', color: '#e05c5c' }}>{error}</p>}
    </div>
  )
}
