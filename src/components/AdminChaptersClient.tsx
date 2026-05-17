'use client'

import { useActionState, useState } from 'react'
import { createChapter, updateChapter, deleteChapter, moveChapter } from '@/app/actions/admin'

type Chapter = { id: string; title: string; duration: number; format: string; order: number }

export default function AdminChaptersClient({ courseId, chapters }: { courseId: string; chapters: Chapter[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addState, addAction, addPending] = useActionState(createChapter, undefined)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Chapter list */}
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>
          Chapitres · {chapters.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {chapters.map((ch, idx) => (
            <ChapterRow
              key={ch.id}
              chapter={ch}
              courseId={courseId}
              isFirst={idx === 0}
              isLast={idx === chapters.length - 1}
              editing={editingId === ch.id}
              onEdit={() => setEditingId(editingId === ch.id ? null : ch.id)}
            />
          ))}
          {chapters.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>Aucun chapitre</p>
          )}
        </div>
      </div>

      {/* Add chapter */}
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>Ajouter un chapitre</div>
        <form action={addAction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="hidden" name="courseId" value={courseId} />
          <input className="f-in" name="title" placeholder="Titre du chapitre" required style={{ fontSize: '13px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input className="f-in" name="duration" type="number" placeholder="Durée (min)" min={1} style={{ fontSize: '13px' }} />
            <select className="f-in" name="format" style={{ fontSize: '13px' }}>
              <option>Vidéo</option>
              <option>Texte</option>
              <option>Texte + Vidéo</option>
              <option>Audio</option>
            </select>
          </div>
          {addState?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{addState.error}</p>}
          <button type="submit" className="btn-ghost" disabled={addPending} style={{ fontSize: '12px', padding: '8px 14px', alignSelf: 'flex-start' }}>
            {addPending ? '…' : '+ Ajouter'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ChapterRow({ chapter, courseId, isFirst, isLast, editing, onEdit }: {
  chapter: Chapter; courseId: string; isFirst: boolean; isLast: boolean; editing: boolean; onEdit: () => void
}) {
  const [state, action, pending] = useActionState(updateChapter, undefined)

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', minWidth: '22px', textAlign: 'right' }}>{chapter.order}</span>
        <span style={{ flex: 1, fontSize: '13px' }}>{chapter.title}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{chapter.duration}min</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{chapter.format}</span>

        {/* Move up */}
        <form action={moveChapter} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" disabled={isFirst} style={{ background: 'none', border: 'none', color: isFirst ? 'var(--border)' : 'var(--muted)', cursor: isFirst ? 'default' : 'pointer', fontSize: '14px', padding: '0 2px' }} title="Monter">↑</button>
        </form>

        {/* Move down */}
        <form action={moveChapter} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" disabled={isLast} style={{ background: 'none', border: 'none', color: isLast ? 'var(--border)' : 'var(--muted)', cursor: isLast ? 'default' : 'pointer', fontSize: '14px', padding: '0 2px' }} title="Descendre">↓</button>
        </form>

        <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>
          {editing ? '✕' : 'edit'}
        </button>

        <form action={deleteChapter} onSubmit={e => { if (!confirm('Supprimer ce chapitre ?')) e.preventDefault() }} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }} title="Supprimer">×</button>
        </form>
      </div>

      {editing && (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingLeft: '30px' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input className="f-in" name="title" defaultValue={chapter.title} required style={{ fontSize: '13px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input className="f-in" name="duration" type="number" defaultValue={chapter.duration} min={1} style={{ fontSize: '13px' }} />
            <select className="f-in" name="format" defaultValue={chapter.format} style={{ fontSize: '13px' }}>
              <option>Vidéo</option>
              <option>Texte</option>
              <option>Texte + Vidéo</option>
              <option>Audio</option>
            </select>
          </div>
          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}
          <button type="submit" className="btn-ghost" disabled={pending} style={{ fontSize: '12px', padding: '6px 12px', alignSelf: 'flex-start' }}>
            {pending ? '…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </div>
  )
}
