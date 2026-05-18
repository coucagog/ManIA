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

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setLocalNote(noteContent) }, [noteContent, chapterId])

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

  return (
    <>
      {/* Portal: injects mobile tab bar into the lesson-center container */}
      {mounted && document.getElementById('m-lesson-tabs-container') &&
        createPortal(mobileTabBar, document.getElementById('m-lesson-tabs-container')!)}

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
                  {resources.map(r => (
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
