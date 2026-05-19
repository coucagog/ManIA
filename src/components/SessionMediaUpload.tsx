'use client'

import { useState, useRef } from 'react'

type MediaType = 'image' | 'pdf' | 'video'

type Props = {
  initialUrl?: string | null
  initialType?: string | null
}

function isVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url) || /\.(mp4|webm|mov)$/i.test(url)
}

function VideoPreview({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '8px' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  if (vimeoMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '8px' }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <video controls src={url} style={{ width: '100%', borderRadius: '8px', maxHeight: '220px' }} />
  )
}

export default function SessionMediaUpload({ initialUrl, initialType }: Props) {
  const [mediaType, setMediaType] = useState<MediaType>((initialType as MediaType) || 'image')
  const [mediaUrl, setMediaUrl] = useState(initialUrl ?? '')
  const [videoInput, setVideoInput] = useState(initialType === 'video' ? (initialUrl ?? '') : '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const hasMedia = mediaUrl.trim() !== ''

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', mediaType)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload')
      setMediaUrl(json.url)
      setFileName(file.name)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erreur upload')
    }
    setUploading(false)
  }

  function handleVideoCommit() {
    const url = videoInput.trim()
    if (!url) return
    setMediaUrl(url)
    setFileName('')
  }

  function handleRemove() {
    setMediaUrl('')
    setFileName('')
    setVideoInput('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const tabs: { key: MediaType; label: string; icon: string }[] = [
    { key: 'image', label: 'Affiche / Image', icon: '🖼' },
    { key: 'pdf',   label: 'Plaquette PDF',  icon: '📄' },
    { key: 'video', label: 'Vidéo',          icon: '▶' },
  ]

  const accept: Record<MediaType, string> = {
    image: 'image/jpeg,image/png,image/webp,image/gif',
    pdf:   'application/pdf',
    video: 'video/mp4,video/webm,video/quicktime',
  }

  const hint: Record<MediaType, string> = {
    image: 'JPG, PNG, WEBP · max 8 Mo',
    pdf:   'PDF · max 20 Mo',
    video: 'MP4, WEBM · max 150 Mo',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="mediaUrl" value={mediaUrl} />
      <input type="hidden" name="mediaType" value={hasMedia ? mediaType : ''} />

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setMediaType(t.key); handleRemove() }}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: mediaType === t.key ? 'var(--coral)' : 'var(--bg)',
              color: mediaType === t.key ? '#fff' : 'var(--muted)',
              boxShadow: mediaType === t.key
                ? '3px 3px 8px rgba(240,140,106,.35),-2px -2px 6px rgba(240,140,106,.12)'
                : 'var(--neo-r-sm)',
              fontFamily: 'var(--sans)',
              fontWeight: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <span style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Current media preview */}
      {hasMedia && (
        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', boxShadow: 'var(--neo-i-sm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mediaType === 'image' && (
            <img src={mediaUrl} alt="Aperçu" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
          )}
          {mediaType === 'pdf' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName || mediaUrl.split('/').pop()}
                </div>
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--coral)' }}>
                  Ouvrir →
                </a>
              </div>
            </div>
          )}
          {mediaType === 'video' && <VideoPreview url={mediaUrl} />}
          <button
            type="button"
            onClick={handleRemove}
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            ✕ Supprimer ce média
          </button>
        </div>
      )}

      {/* Upload / URL input */}
      {!hasMedia && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mediaType !== 'video' ? (
            <>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '24px 16px',
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  boxShadow: 'var(--neo-i-sm)',
                  cursor: uploading ? 'wait' : 'pointer',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '28px' }}>{uploading ? '⏳' : mediaType === 'pdf' ? '📄' : '🖼'}</span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {uploading ? 'Upload en cours…' : 'Cliquer pour choisir un fichier'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{hint[mediaType]}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={accept[mediaType]}
                  onChange={handleFile}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              {uploadError && <p style={{ fontSize: '12px', color: '#e05c5c' }}>{uploadError}</p>}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Video URL */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>
                  URL YouTube, Vimeo ou lien direct
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="f-in"
                    type="url"
                    placeholder="https://youtube.com/watch?v=… ou https://vimeo.com/…"
                    value={videoInput}
                    onChange={e => setVideoInput(e.target.value)}
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={handleVideoCommit}
                    disabled={!videoInput.trim()}
                    className="btn-ghost"
                    style={{ fontSize: '12px', padding: '8px 14px', whiteSpace: 'nowrap' }}
                  >
                    OK
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>ou</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  boxShadow: 'var(--neo-i-sm)',
                  cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                <span style={{ fontSize: '20px' }}>{uploading ? '⏳' : '▶'}</span>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {uploading ? 'Upload en cours…' : 'Importer un fichier vidéo'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{hint.video}</div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={accept.video}
                  onChange={handleFile}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              {uploadError && <p style={{ fontSize: '12px', color: '#e05c5c' }}>{uploadError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
