'use client'

import { useState } from 'react'

type Props = {
  url: string
  mediaType: string
  title: string
}

function embedUrl(url: string): { kind: 'youtube' | 'vimeo' | 'file'; src: string } {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` }
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vi[1]}` }
  return { kind: 'file', src: url }
}

function ImageViewer({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', display: 'block', width: '100%' }}
        title="Agrandir"
      >
        <img
          src={url}
          alt={`Affiche — ${title}`}
          style={{ width: '100%', borderRadius: '10px', boxShadow: 'var(--neo-r-sm)', display: 'block', maxHeight: '260px', objectFit: 'cover' }}
        />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '24px',
          }}
        >
          <img
            src={url}
            alt={title}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 48px rgba(0,0,0,.6)', cursor: 'default' }}
          />
          <button
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', top: '20px', right: '24px', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

function VideoPlayer({ url }: { url: string }) {
  const embed = embedUrl(url)
  if (embed.kind === 'file') {
    return (
      <video
        controls
        src={embed.src}
        style={{ width: '100%', borderRadius: '10px', boxShadow: 'var(--neo-r-sm)', maxHeight: '280px' }}
      />
    )
  }
  return (
    <iframe
      src={embed.src}
      style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '10px', boxShadow: 'var(--neo-r-sm)' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}

export default function SessionMediaView({ url, mediaType, title }: Props) {
  if (mediaType === 'image') {
    return (
      <div style={{ marginTop: '12px' }}>
        <ImageViewer url={url} title={title} />
        <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', textAlign: 'center' }}>Cliquer pour agrandir</p>
      </div>
    )
  }

  if (mediaType === 'pdf') {
    const filename = url.split('/').pop() ?? 'document.pdf'
    return (
      <div style={{ marginTop: '12px' }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'var(--bg)',
            borderRadius: '10px',
            boxShadow: 'var(--neo-r-sm)',
            textDecoration: 'none',
            color: 'var(--fg)',
          }}
        >
          <span style={{ fontSize: '28px', flexShrink: 0 }}>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>Plaquette de la session</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--coral)', flexShrink: 0, fontWeight: 500 }}>Ouvrir →</span>
        </a>
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div style={{ marginTop: '12px' }}>
        <VideoPlayer url={url} />
      </div>
    )
  }

  return null
}
