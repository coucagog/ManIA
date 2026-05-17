'use client'

import { useActionState, useState, useEffect } from 'react'
import { saveNote } from '@/app/actions/notes'

interface Props {
  noteContent: string
  chapterId: string
  slug: string
  chapterTitle: string
}

export default function LessonPanel({ noteContent, chapterId, slug, chapterTitle }: Props) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'ressources' | 'notes'>('transcript')
  const [noteState, noteAction, notePending] = useActionState(saveNote, undefined)
  const [localNote, setLocalNote] = useState(noteContent)

  // Sync note content when chapter changes (prop update from server)
  useEffect(() => { setLocalNote(noteContent) }, [noteContent, chapterId])

  return (
    <div className="rpanel">
      <div className="p-tabs">
        <button
          className={`p-tab${activeTab === 'transcript' ? ' active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >Transcript</button>
        <button
          className={`p-tab${activeTab === 'ressources' ? ' active' : ''}`}
          onClick={() => setActiveTab('ressources')}
        >Ressources</button>
        <button
          className={`p-tab${activeTab === 'notes' ? ' active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >Notes</button>
      </div>

      <div className="p-content">
        {activeTab === 'transcript' && (
          <div className="tab-pane active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Suivre la lecture</span>
              <button className="c-btn" style={{ fontSize: '11px', padding: '5px 10px' }}>Lire sans la vidéo</button>
            </div>
            <div className="tr-para">
              <div className="tr-ts">00:00</div>
              Dans ce chapitre, nous allons examiner les concepts fondamentaux abordés dans <em>{chapterTitle}</em>.
            </div>
            <div className="tr-para">
              <div className="tr-ts">01:24</div>
              La question centrale est celle de la coordination des systèmes dans des environnements institutionnels fermés.
            </div>
            <div className="tr-para cur">
              <div className="tr-ts">04:38</div>
              L&apos;orchestrateur joue ici un rôle clé dans la gestion des décisions et la traçabilité.
            </div>
          </div>
        )}

        {activeTab === 'ressources' && (
          <div className="tab-pane active">
            <div className="res-item">
              <div className="res-icon">PDF</div>
              <div>
                <div className="res-name">Cadre méthodologique — {chapterTitle}</div>
                <div className="res-size">320 Ko</div>
              </div>
              <span className="res-dl">↓ Télécharger</span>
            </div>
            <div className="res-item">
              <div className="res-icon">PDF</div>
              <div>
                <div className="res-name">Fiche de synthèse</div>
                <div className="res-size">88 Ko</div>
              </div>
              <span className="res-dl">↓ Télécharger</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '16px', lineHeight: 1.5 }}>
              Toutes les ressources sont confidentielles et réservées aux apprenants MANIA.
            </p>
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
                  <span style={{ fontSize: '12px', color: 'var(--accent)' }}>✓ Sauvegardé</span>
                )}
              </div>
            </form>
            <p className="notes-priv" style={{ marginTop: '14px' }}>Vos notes sont privées.</p>
          </div>
        )}
      </div>
    </div>
  )
}
