'use client'

import { useActionState, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { saveNote } from '@/app/actions/notes'

type PanelTab = 'transcript' | 'ressources' | 'notes'
type MobileTab = 'video' | PanelTab

type Resource = { id: string; name: string; fileType: string; url: string; fileSize: number | null }

interface Props {
  noteContent: string
  chapterId: string
  slug: string
  chapterTitle: string
  content: string | null
  resources: Resource[]
}

// L'étiquette fileType est figée au téléversement et ignore le SVG : on décide
// de l'aperçu sur l'extension de l'URL, ce qui vaut aussi pour l'existant.
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg']

function isImage(url: string) {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXT.includes(ext)
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function LessonPanel({ noteContent, chapterId, slug, chapterTitle, content, resources }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('transcript')
  const [mobileTab, setMobileTab] = useState<MobileTab>('video')
  const [noteState, noteAction, notePending] = useActionState(saveNote, undefined)
  const [localNote, setLocalNote] = useState(noteContent)
  const [mounted, setMounted] = useState(false)
  // On mémorise le chapitre d'ouverture : si le chapitre change sous le
  // panneau, la visionneuse se referme d'elle-même, sans effet de reprise.
  const [opened, setOpened] = useState<{ chapterId: string; index: number } | null>(null)
  const shot = opened && opened.chapterId === chapterId ? opened.index : null

  const images = resources.filter(r => isImage(r.url))
  const setShot = (index: number | null) =>
    setOpened(index === null ? null : { chapterId, index })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setLocalNote(noteContent) }, [noteContent, chapterId])

  // Visionneuse ouverte : Échap ferme, flèches naviguent, et le fond ne défile
  // plus derrière le calque.
  useEffect(() => {
    if (shot === null) return
    const count = images.length
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpened(null)
      else if (e.key === 'ArrowRight') setOpened({ chapterId, index: (shot! + 1) % count })
      else if (e.key === 'ArrowLeft') setOpened({ chapterId, index: (shot! - 1 + count) % count })
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [shot, images.length, chapterId])

  function switchTab(tab: PanelTab) {
    setActiveTab(tab)
    setMobileTab(tab)
  }

  function switchMobile(tab: MobileTab) {
    setMobileTab(tab)
    if (tab !== 'video') setActiveTab(tab as PanelTab)
  }

  const mobileTabs: { key: MobileTab; label: string }[] = [
    { key: 'video', label: 'Vidéo' },
    { key: 'transcript', label: 'Transcription' },
    { key: 'ressources', label: 'Ressources' },
    { key: 'notes', label: 'Notes' },
  ]

  const mobileTabBar = (
    <div className="mlt-inner">
      {mobileTabs.map(({ key, label }) => (
        <button
          key={key}
          className={`mlt-btn${mobileTab === key ? ' active' : ''}`}
          onClick={() => switchMobile(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )

  const current = shot !== null ? images[shot] : undefined

  const viewer = current && (
    <div className="lb" role="dialog" aria-modal="true" aria-label={current.name} onClick={() => setShot(null)}>
      <button className="lb-x" onClick={() => setShot(null)} aria-label="Fermer">✕</button>

      {images.length > 1 && (
        <button
          className="lb-nav lb-prev"
          aria-label="Schéma précédent"
          onClick={e => { e.stopPropagation(); setShot((shot! - 1 + images.length) % images.length) }}
        >‹</button>
      )}

      <img className="lb-img" src={current.url} alt={current.name} onClick={e => e.stopPropagation()} />

      {images.length > 1 && (
        <button
          className="lb-nav lb-next"
          aria-label="Schéma suivant"
          onClick={e => { e.stopPropagation(); setShot((shot! + 1) % images.length) }}
        >›</button>
      )}

      <div className="lb-bar" onClick={e => e.stopPropagation()}>
        <span className="lb-name">{current.name}</span>
        {images.length > 1 && <span className="lb-count">{shot! + 1} / {images.length}</span>}
        <a className="lb-full" href={current.url} target="_blank" rel="noreferrer">Taille réelle ↗</a>
      </div>
    </div>
  )

  return (
    <>
      {/* Portal: injects mobile tab bar into the lesson-center container */}
      {mounted && document.getElementById('m-lesson-tabs-container') &&
        createPortal(mobileTabBar, document.getElementById('m-lesson-tabs-container')!)}

      {/* Portal: the viewer must escape the panel's overflow */}
      {mounted && viewer && createPortal(viewer, document.body)}

      <div className={`rpanel${mobileTab !== 'video' ? ' m-visible' : ''}`}>
        <div className="p-tabs">
          {(['transcript', 'ressources', 'notes'] as PanelTab[]).map(tab => (
            <button
              key={tab}
              className={`p-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => switchTab(tab)}
            >
              {tab === 'transcript' ? 'Transcript' : tab === 'ressources' ? 'Ressources' : 'Notes'}
            </button>
          ))}
        </div>

        <div className="p-content">
          {activeTab === 'transcript' && (
            <div className="tab-pane active">
              {content ? (
                <div style={{ fontSize: '13px', lineHeight: 1.75, color: 'var(--fg)', whiteSpace: 'pre-wrap' }}>
                  {content}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '8px' }}>
                  Le contenu de ce chapitre sera disponible prochainement.
                </p>
              )}
            </div>
          )}

          {activeTab === 'ressources' && (
            <div className="tab-pane active">
              {resources.length > 0 ? (
                <>
                  {resources.map(r => isImage(r.url) ? (
                    <button
                      key={r.id}
                      type="button"
                      className="res-shot"
                      onClick={() => setShot(images.findIndex(i => i.id === r.id))}
                      aria-label={`Agrandir : ${r.name}`}
                    >
                      <img className="res-shot-img" src={r.url} alt={r.name} loading="lazy" />
                      <span className="res-shot-cap">
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="res-name" style={{ display: 'block' }}>{r.name}</span>
                          {r.fileSize && <span className="res-size">{fmtSize(r.fileSize)}</span>}
                        </span>
                        <span className="res-dl">⤢ Agrandir</span>
                      </span>
                    </button>
                  ) : (
                    <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="res-item" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      <div className="res-icon">{r.fileType}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="res-name">{r.name}</div>
                        {r.fileSize && <div className="res-size">{fmtSize(r.fileSize)}</div>}
                      </div>
                      <span className="res-dl">↓</span>
                    </a>
                  ))}
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '16px', lineHeight: 1.5 }}>
                    Ressources confidentielles réservées aux apprenants MANIA.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '8px' }}>
                  Aucune ressource pour ce chapitre.
                </p>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="tab-pane active">
              <p className="notes-hint">Vos notes sont liées à ce chapitre.</p>
              <form action={noteAction}>
                <input type="hidden" name="chapterId" value={chapterId} />
                <input type="hidden" name="slug" value={slug} />
                <textarea
                  className="notes-ta"
                  name="content"
                  placeholder="Vos notes pour ce chapitre…"
                  value={localNote}
                  onChange={e => setLocalNote(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn-ghost"
                    disabled={notePending}
                    style={{ fontSize: '12px', padding: '7px 14px' }}
                  >
                    {notePending ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                  {noteState?.ok && !notePending && (
                    <span style={{ fontSize: '12px', color: 'var(--coral)' }}>✓ Sauvegardé</span>
                  )}
                </div>
              </form>
              <p className="notes-priv" style={{ marginTop: '14px' }}>Vos notes sont privées.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
