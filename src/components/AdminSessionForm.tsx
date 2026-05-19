'use client'

import { useActionState } from 'react'
import { createSession, updateSession, deleteSession } from '@/app/actions/sessions'
import Link from 'next/link'
import SessionMediaUpload from '@/components/SessionMediaUpload'

type SessionData = {
  id: string; title: string; date: string; endDate?: string | null
  location: string; address?: string | null; description?: string | null
  instructor: string; maxSeats?: number | null; status: string
  mediaUrl?: string | null; mediaType?: string | null
}
type Props = { mode: 'create'; experts: string[] } | { mode: 'edit'; session: SessionData; experts: string[] }

export default function AdminSessionForm(props: Props) {
  const fn = props.mode === 'create' ? createSession : updateSession
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(fn, undefined)
  const s = props.mode === 'edit' ? props.session : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Nouvelle session' : 'Modifier la session'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {s && <input type="hidden" name="id" value={s.id} />}

          <Field label="Titre" name="title" defaultValue={s?.title} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Date de début" name="date" type="datetime-local" defaultValue={s?.date} required />
            <Field label="Date de fin (optionnel)" name="endDate" type="datetime-local" defaultValue={s?.endDate ?? ''} />
          </div>
          <Field label="Lieu (salle, ville)" name="location" defaultValue={s?.location} required />
          <Field label="Adresse complète (optionnel)" name="address" defaultValue={s?.address ?? ''} />
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Intervenant</label>
            <input
              className="f-in" name="instructor" list="experts-list"
              defaultValue={s?.instructor} required
              placeholder="Nom ou choisir parmi les experts…"
              style={{ width: '100%', fontSize: '13px' }}
            />
            <datalist id="experts-list">
              {props.experts.map(e => <option key={e} value={e} />)}
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea className="notes-ta" name="description" defaultValue={s?.description ?? ''} placeholder="Programme, objectifs, prérequis…" style={{ fontSize: '13px', minHeight: '90px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Nombre de places (optionnel)" name="maxSeats" type="number" defaultValue={s?.maxSeats?.toString() ?? ''} />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Statut</label>
              <select className="f-in" name="status" defaultValue={s?.status ?? 'upcoming'} style={{ width: '100%', fontSize: '13px' }}>
                <option value="upcoming">À venir</option>
                <option value="past">Passée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
          </div>

          {/* Media */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
              Média de présentation (optionnel)
            </div>
            <SessionMediaUpload
              initialUrl={s?.mediaUrl}
              initialType={s?.mediaType}
            />
          </div>

          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {('ok' in (state ?? {})) && state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? '…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            {props.mode === 'create' && (
              <Link href="/admin/sessions" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>Annuler</Link>
            )}
          </div>
        </form>
      </div>

      {s && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteSession} onSubmit={e => { if (!confirm('Supprimer cette session ?')) e.preventDefault() }}>
            <input type="hidden" name="id" value={s.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer la session
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
