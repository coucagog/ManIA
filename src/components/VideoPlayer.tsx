'use client'

import { useRef, useState } from 'react'

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

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

function CustomVideoPlayer({ url, title }: { url: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  const notStarted = currentTime === 0 && !playing
  const progress = duration ? (currentTime / duration) * 100 : 0

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  function seek(delta: number) {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta))
  }

  function changeSpeed(s: number) {
    const v = videoRef.current
    if (v) v.playbackRate = s
    setSpeed(s)
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen()
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  return (
    <div className="player" ref={containerRef} style={{ padding: 0 }}>
      {/* Screen */}
      <div
        style={{ position: 'relative', cursor: 'pointer', background: '#000', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={url}
          style={{ width: '100%', display: 'block', minHeight: '220px', maxHeight: '420px', objectFit: 'contain', background: '#000' }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
        {/* Overlay: full dark before first play, semi-transparent when paused mid-video */}
        {!playing && (
          <div style={{
            position: 'absolute', inset: 0,
            background: notStarted ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '14px',
          }}>
            <button className="play-btn" style={{ pointerEvents: 'none' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            {notStarted && <div className="vid-overlay" style={{ position: 'static' }}>{title} · MANIA</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="vid-ctrls">
        <div className="prog-row">
          <span className="vid-time">{fmtTime(currentTime)}</span>
          <div className="vid-prog" style={{ cursor: 'pointer' }} onClick={handleProgressClick}>
            <div className="vid-prog-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="vid-time">{fmtTime(duration)}</span>
        </div>
        <div className="ctrl-row">
          <button className="c-btn" onClick={e => { e.stopPropagation(); seek(-10) }}>−10s</button>
          <button className="c-btn" onClick={e => { e.stopPropagation(); seek(10) }}>+10s</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
          {SPEEDS.map(s => (
            <button key={s} className={`c-btn sp-btn${speed === s ? ' on' : ''}`}
              onClick={e => { e.stopPropagation(); changeSpeed(s) }}>
              {s}×
            </button>
          ))}
          <div className="sp" />
          <button className="c-btn">FR</button>
          <button className="c-btn active" onClick={e => { e.stopPropagation(); toggleFullscreen() }}>⛶</button>
        </div>
      </div>
    </div>
  )
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
    return <CustomVideoPlayer url={url} title={title} />
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
