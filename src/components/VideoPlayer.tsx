'use client'

import { useRef, useState, useCallback } from 'react'

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

function SpeakerIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  )
  if (volume < 0.5) return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
    </svg>
  )
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function CustomVideoPlayer({ url, title }: { url: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

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

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    setMuted(next)
  }

  const applyVolume = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.volume = vol
    v.muted = vol === 0
    setVolume(vol)
    setMuted(vol === 0)
  }, [])

  function onVolPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    applyVolume(e)
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
          {/* Volume control */}
          <button
            className="c-btn"
            onClick={e => { e.stopPropagation(); toggleMute() }}
            title={muted ? 'Activer le son' : 'Couper le son'}
            style={{ color: muted ? 'var(--coral)' : undefined }}
          >
            <SpeakerIcon volume={volume} muted={muted} />
          </button>
          <div
            style={{ width: '70px', height: '3px', background: 'var(--border)', borderRadius: '2px', cursor: 'pointer', flexShrink: 0, touchAction: 'none' }}
            onPointerDown={e => { e.stopPropagation(); onVolPointerDown(e) }}
            onPointerMove={e => { if (e.buttons === 1) { e.stopPropagation(); applyVolume(e) } }}
          >
            <div style={{ width: `${muted ? 0 : volume * 100}%`, height: '100%', background: 'var(--coral)', borderRadius: '2px', transition: 'width 0.05s' }} />
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
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
