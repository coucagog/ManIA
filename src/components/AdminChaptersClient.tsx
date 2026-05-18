'use client'

import { useActionState, useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createChapter, updateChapter, deleteChapter, moveChapter, createResource, deleteResource } from '@/app/actions/admin'

type Resource = { id: string; name: string; fileType: string; url: string; fileSize: number | null }
type Chapter = {
  id: string; title: string; duration: number; format: string; order: number
  videoUrl: string | null; content: string | null; resources: Resource[]
}

function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'PDF'
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'Vidéo'
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'Audio'
  if (['doc', 'docx'].includes(ext)) return 'Word'
  if (['ppt', 'pptx'].includes(ext)) return 'PPT'
  if (['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image'
  return 'Fichier'
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function AdminChaptersClient({ courseId, chapters }: { courseId: string; chapters: Chapter[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addState, addAction, addPending] = useActionState(createChapter, undefined)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>Ajouter un chapitre</div>
        <form action={addAction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="hidden" name="courseId" value={courseId} />
          <input className="f-in" name="title" placeholder="Titre du chapitre" required style={{ fontSize: '13px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input className="f-in" name="duration" type="number" placeholder="Durée (min)" min={1} style={{ fontSize: '13px' }} />
            <select className="f-in" name="format" style={{ fontSize: '13px' }}>
              <option>Vidéo</option><option>Texte</option><option>Texte + Vidéo</option>
              <option>Texte + Audio</option><option>Audio</option>
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
  const [tab, setTab] = useState<'infos' | 'ressources'>('infos')
  const videoUrlRef = useRef<HTMLInputElement>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadedName, setVideoUploadedName] = useState<string | null>(null)

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoUploading(true)
    setVideoUploadedName(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (videoUrlRef.current) videoUrlRef.current.value = json.url
      setVideoUploadedName(file.name)
    } catch {
      alert('Erreur lors de l\'upload.')
    }
    setVideoUploading(false)
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', minWidth: '22px', textAlign: 'right' }}>{chapter.order}</span>
        <span style={{ flex: 1, fontSize: '13px' }}>{chapter.title}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{chapter.duration}min</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{chapter.format}</span>
        {chapter.videoUrl && <span style={{ fontSize: '10px', color: 'var(--coral)' }}>▶</span>}
        {chapter.resources.length > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--inset)', padding: '1px 5px', borderRadius: '10px' }}>
            {chapter.resources.length}
          </span>
        )}

        <form action={moveChapter} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" disabled={isFirst} style={{ background: 'none', border: 'none', color: isFirst ? 'var(--border)' : 'var(--muted)', cursor: isFirst ? 'default' : 'pointer', fontSize: '14px', padding: '0 2px' }}>↑</button>
        </form>
        <form action={moveChapter} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" disabled={isLast} style={{ background: 'none', border: 'none', color: isLast ? 'var(--border)' : 'var(--muted)', cursor: isLast ? 'default' : 'pointer', fontSize: '14px', padding: '0 2px' }}>↓</button>
        </form>

        <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>
          {editing ? '✕' : 'edit'}
        </button>
        <form action={deleteChapter} onSubmit={e => { if (!confirm('Supprimer ce chapitre ?')) e.preventDefault() }} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
        </form>
      </div>

      {editing && (
        <div style={{ marginTop: '12px', paddingLeft: '30px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
            {(['infos', 'ressources'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--coral)' : 'var(--muted)',
                padding: '6px 12px 7px', borderBottom: tab === t ? '2px solid var(--coral)' : '2px solid transparent',
                textTransform: 'capitalize', letterSpacing: '.04em',
              }}>
                {t === 'infos' ? 'Infos & Contenu' : `Ressources${chapter.resources.length ? ` (${chapter.resources.length})` : ''}`}
              </button>
            ))}
          </div>

          {tab === 'infos' && (
            <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="hidden" name="id" value={chapter.id} />
              <input type="hidden" name="courseId" value={courseId} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '8px' }}>
                <input className="f-in" name="title" defaultValue={chapter.title} required style={{ fontSize: '13px' }} />
                <input className="f-in" name="duration" type="number" defaultValue={chapter.duration} min={1} style={{ fontSize: '13px' }} />
                <select className="f-in" name="format" defaultValue={chapter.format} style={{ fontSize: '13px' }}>
                  <option>Vidéo</option><option>Texte</option><option>Texte + Vidéo</option>
                  <option>Texte + Audio</option><option>Audio</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>URL vidéo / audio</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    ref={videoUrlRef}
                    className="f-in" name="videoUrl" defaultValue={chapter.videoUrl ?? ''}
                    placeholder="YouTube, Vimeo, lien .mp4 / .mp3…"
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', padding: '0 10px', height: '36px',
                    background: videoUploading ? 'var(--inset)' : 'var(--inset)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                    cursor: videoUploading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    color: 'var(--muted)',
                  }}>
                    {videoUploading ? '…' : '↑ Fichier'}
                    <input
                      type="file" accept="video/*,audio/*,.mp4,.mp3,.webm,.mov,.m4a,.wav,.ogg"
                      onChange={handleVideoFile}
                      disabled={videoUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                {videoUploadedName && (
                  <div style={{ fontSize: '11px', color: 'var(--coral)', marginTop: '3px' }}>✓ {videoUploadedName} uploadé</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>YouTube, Vimeo, lien direct ou fichier local.</div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Contenu / Transcription</label>
                <textarea
                  className="notes-ta" name="content" defaultValue={chapter.content ?? ''}
                  placeholder="Texte du chapitre, transcription, résumé…"
                  style={{ fontSize: '13px', minHeight: '100px', width: '100%' }}
                />
              </div>

              {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
              {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}
              <button type="submit" className="btn-ghost" disabled={pending} style={{ fontSize: '12px', padding: '6px 12px', alignSelf: 'flex-start' }}>
                {pending ? '…' : 'Enregistrer'}
              </button>
            </form>
          )}

          {tab === 'ressources' && (
            <ResourceSection chapterId={chapter.id} courseId={courseId} resources={chapter.resources} />
          )}
        </div>
      )}
    </div>
  )
}

function ResourceSection({ chapterId, courseId, resources }: {
  chapterId: string; courseId: string; resources: Resource[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [pendingName, setPendingName] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [pendingSize, setPendingSize] = useState(0)
  const [linkMode, setLinkMode] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      setUploadedUrl(json.url)
      setPendingName(json.name)
      setPendingType(detectFileType(json.name))
      setPendingSize(json.size)
    } catch {
      alert('Erreur lors de l\'upload.')
    }
    setUploading(false)
  }

  async function addFileResource() {
    if (!uploadedUrl || !pendingName) return
    const fd = new FormData()
    fd.append('chapterId', chapterId)
    fd.append('courseId', courseId)
    fd.append('name', pendingName)
    fd.append('url', uploadedUrl)
    fd.append('fileType', pendingType)
    fd.append('fileSize', String(pendingSize))
    await createResource(fd)
    setUploadedUrl(''); setPendingName(''); setPendingType(''); setPendingSize(0)
    if (fileRef.current) fileRef.current.value = ''
    startTransition(() => router.refresh())
  }

  async function addLinkResource() {
    if (!linkUrl || !linkName) return
    const fd = new FormData()
    fd.append('chapterId', chapterId)
    fd.append('courseId', courseId)
    fd.append('name', linkName)
    fd.append('url', linkUrl)
    fd.append('fileType', 'Lien')
    await createResource(fd)
    setLinkName(''); setLinkUrl(''); setLinkMode(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette ressource ?')) return
    const fd = new FormData()
    fd.append('id', id)
    fd.append('courseId', courseId)
    await deleteResource(fd)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Existing resources */}
      {resources.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {resources.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--r-sm)' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, background: 'var(--inset)', padding: '2px 6px', borderRadius: '4px', color: 'var(--coral)', whiteSpace: 'nowrap' }}>{r.fileType}</span>
              <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {r.fileSize && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmtSize(r.fileSize)}</span>}
              <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--muted)' }}>↗</a>
              <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      )}
      {resources.length === 0 && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Aucune ressource.</p>
      )}

      {/* Toggle: file vs link */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => { setLinkMode(false) }}
          style={{ fontSize: '11px', padding: '5px 10px', background: !linkMode ? 'var(--coral)' : 'var(--inset)', color: !linkMode ? 'white' : 'var(--muted)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
        >
          ↑ Fichier
        </button>
        <button
          onClick={() => { setLinkMode(true) }}
          style={{ fontSize: '11px', padding: '5px 10px', background: linkMode ? 'var(--coral)' : 'var(--inset)', color: linkMode ? 'white' : 'var(--muted)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
        >
          🔗 Lien externe
        </button>
      </div>

      {!linkMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input ref={fileRef} type="file" onChange={handleFile} style={{ fontSize: '12px' }} disabled={uploading} />
          {uploading && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Upload en cours…</span>}
          {uploadedUrl && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="f-in" value={pendingName} onChange={e => setPendingName(e.target.value)}
                placeholder="Nom du fichier" style={{ flex: 1, fontSize: '12px' }}
              />
              <button
                onClick={addFileResource}
                disabled={isPending || !pendingName}
                style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {isPending ? '…' : '+ Ajouter'}
              </button>
            </div>
          )}
        </div>
      )}

      {linkMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            className="f-in" value={linkName} onChange={e => setLinkName(e.target.value)}
            placeholder="Nom du lien" style={{ fontSize: '12px' }}
          />
          <input
            className="f-in" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://…" style={{ fontSize: '12px' }}
          />
          <button
            onClick={addLinkResource}
            disabled={isPending || !linkName || !linkUrl}
            style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            {isPending ? '…' : '+ Ajouter le lien'}
          </button>
        </div>
      )}
    </div>
  )
}
