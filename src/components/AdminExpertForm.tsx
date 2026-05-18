'use client'

import { useActionState, useRef, useState } from 'react'
import { createExpert, updateExpert, deleteExpert } from '@/app/actions/experts'
import Link from 'next/link'

type UserOption = { id: string; name: string; email: string; photoUrl?: string | null; initials: string }

type ExpertData = {
  id: string; userId?: string | null; name: string; title: string
  institution?: string | null; bio?: string | null; photoUrl?: string | null
  speakerKey?: string | null; order: number
}

type Props =
  | { mode: 'create'; speakers: string[]; users: UserOption[] }
  | { mode: 'edit'; expert: ExpertData; speakers: string[]; users: UserOption[] }

export default function AdminExpertForm(props: Props) {
  const fn = props.mode === 'create' ? createExpert : updateExpert
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(fn, undefined)
  const e = props.mode === 'edit' ? props.expert : null

  const [source, setSource] = useState<'linked' | 'manual'>(e?.userId ? 'linked' : 'manual')
  const [userId, setUserId] = useState(e?.userId ?? '')
  const [name, setName] = useState(e?.name ?? '')
  const [photoUrl, setPhotoUrl] = useState(e?.photoUrl ?? '')

  const photoFileRef = useRef<HTMLInputElement>(null)

  function handleUserSelect(uid: string) {
    setUserId(uid)
    if (uid) {
      const u = props.users.find(u => u.id === uid)
      if (u) {
        setName(u.name)
        setPhotoUrl(u.photoUrl ?? '')
      }
    }
  }

  async function handlePhotoUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      setPhotoUrl(data.url)
    }
  }

  const linkedUser = userId ? props.users.find(u => u.id === userId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Nouvel expert' : 'Modifier l\'expert'}
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {e && <input type="hidden" name="id" value={e.id} />}
          <input type="hidden" name="userId" value={source === 'linked' ? userId : ''} />

          {/* Source toggle */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>Source</div>
            <div style={{ display: 'flex', gap: '0', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content' }}>
              {(['linked', 'manual'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  style={{
                    padding: '7px 16px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: source === s ? 'var(--coral)' : 'var(--inset)',
                    color: source === s ? 'white' : 'var(--muted)',
                    transition: 'background .15s',
                  }}
                >
                  {s === 'linked' ? '👤 Utilisateur existant' : '✏️ Saisie manuelle'}
                </button>
              ))}
            </div>
          </div>

          {/* User picker */}
          {source === 'linked' && (
            <div>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Utilisateur</label>
              <select
                className="f-in"
                value={userId}
                onChange={e => handleUserSelect(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="">— Choisir un utilisateur —</option>
                {props.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              {linkedUser && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--inset)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    overflow: 'hidden', background: 'var(--coral)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: 'white',
                  }}>
                    {linkedUser.photoUrl
                      ? <img src={linkedUser.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : linkedUser.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{linkedUser.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{linkedUser.email}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* Name */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>
              Nom affiché {source === 'linked' && userId && <span style={{ color: 'var(--coral)' }}>(pré-rempli)</span>}
            </label>
            <input
              className="f-in" name="name" type="text"
              value={name} onChange={e => setName(e.target.value)}
              required style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <Field label="Titre / Fonction" name="title" defaultValue={e?.title} required placeholder="ex: Professeur associé, Dr." />
          <Field label="Institution" name="institution" defaultValue={e?.institution ?? ''} placeholder="ex: Polytechnique, CNRS…" />

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Biographie</label>
            <textarea
              className="notes-ta" name="bio" defaultValue={e?.bio ?? ''}
              placeholder="Présentation en quelques phrases…"
              style={{ fontSize: '13px', minHeight: '80px' }}
            />
          </div>

          {/* Photo */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>
              Photo de profil {source === 'linked' && userId && <span style={{ color: 'var(--coral)' }}>(pré-remplie)</span>}
            </label>
            {photoUrl && (
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={photoUrl} alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoUrl}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="f-in" name="photoUrl" type="text"
                value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                placeholder="URL ou charger un fichier"
                style={{ flex: 1, fontSize: '13px' }}
              />
              <label style={{
                padding: '0 14px', height: '40px', display: 'flex', alignItems: 'center',
                background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                ↑ Photo
                <input ref={photoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>

          {/* Speaker link */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Lier aux cours (intervenant)</label>
            <select className="f-in" name="speakerKey" defaultValue={e?.speakerKey ?? ''} style={{ width: '100%', fontSize: '13px' }}>
              <option value="">— Aucun lien automatique —</option>
              {props.speakers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Choisir l&apos;intervenant correspondant dans les cours pour afficher ses cours sur sa fiche.</div>
          </div>

          <Field label="Ordre d'affichage" name="order" type="number" defaultValue={String(e?.order ?? 0)} />

          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? '…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            {props.mode === 'create' && (
              <Link href="/admin/experts" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>Annuler</Link>
            )}
          </div>
        </form>
      </div>

      {e && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteExpert} onSubmit={ev => { if (!confirm('Supprimer cet expert ?')) ev.preventDefault() }}>
            <input type="hidden" name="id" value={e.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer l&apos;expert
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, name, defaultValue, required, placeholder, type = 'text' }: {
  label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>{label}</label>
      <input className="f-in" name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} style={{ width: '100%', fontSize: '13px' }} />
    </div>
  )
}
