'use client'

function detectType(url: string): 'youtube' | 'vimeo' | 'video' | 'audio' | null {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  if (/\.(mp4|webm|mov|ogv)(\?|$)/i.test(url)) return 'video'
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url)) return 'audio'
  return null
}

function getYouTubeId(url: string) {
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1] ?? ''
}

function getVimeoId(url: string) {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? ''
}

const embedStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none',
}
const wrapStyle: React.CSSProperties = {
  position: 'relative', paddingTop: '56.25%', background: '#000',
  borderRadius: 'var(--r-sm)', overflow: 'hidden',
}

export default function VideoPlayer({ url, title }: { url: string | null; title: string }) {
  if (!url) return <MockPlayer title={title} />

  const type = detectType(url)

  if (type === 'youtube') {
    return (
      <div className="player" style={{ padding: 0 }}>
        <div style={wrapStyle}>
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(url)}?rel=0`}
            style={embedStyle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  if (type === 'vimeo') {
    return (
      <div className="player" style={{ padding: 0 }}>
        <div style={wrapStyle}>
          <iframe
            src={`https://player.vimeo.com/video/${getVimeoId(url)}`}
            style={embedStyle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  if (type === 'video') {
    return (
      <div className="player" style={{ padding: 0 }}>
        <video src={url} controls style={{ width: '100%', display: 'block', borderRadius: 'var(--r-sm)', background: '#000' }} />
      </div>
    )
  }

  if (type === 'audio') {
    return (
      <div className="player">
        <div className="player-screen" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', minHeight: '100px' }}>
          <div style={{ fontSize: '32px' }}>🎵</div>
          <div className="vid-overlay" style={{ position: 'static' }}>{title}</div>
        </div>
        <div className="vid-ctrls" style={{ padding: '12px 16px' }}>
          <audio src={url} controls style={{ width: '100%' }} />
        </div>
      </div>
    )
  }

  return <MockPlayer title={title} />
}

function MockPlayer({ title }: { title: string }) {
  return (
    <div className="player">
      <div className="player-screen">
        <button className="play-btn" id="play-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>
        <div className="vid-overlay">{title} · MANIA</div>
      </div>
      <div className="vid-ctrls">
        <div className="prog-row">
          <span className="vid-time">00:00</span>
          <div className="vid-prog"><div className="vid-prog-fill" style={{ width: '0%' }} /></div>
          <span className="vid-time">—:—</span>
        </div>
        <div className="ctrl-row">
          <button className="c-btn">−10s</button>
          <button className="c-btn">+10s</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
          <button className="c-btn sp-btn">0.75×</button>
          <button className="c-btn sp-btn on">1×</button>
          <button className="c-btn sp-btn">1.25×</button>
          <button className="c-btn sp-btn">1.5×</button>
          <button className="c-btn sp-btn">2×</button>
          <div className="sp" />
          <button className="c-btn">FR</button>
          <button className="c-btn active">⛶</button>
        </div>
      </div>
    </div>
  )
}
