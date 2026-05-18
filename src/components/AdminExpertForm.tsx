'use client'

import { useActionState } from 'react'
import { createExpert, updateExpert, deleteExpert } from '@/app/actions/experts'
import Link from 'next/link'

type ExpertData = {
  id: string; name: string; title: string; institution?: string | null
  bio?: string | null; photoUrl?: string | null; speakerKey?: string | null; order: number
}
type Props = { mode: 'create'; speakers: string[] } | { mode: 'edit'; expert: ExpertData; speakers: string[] }

export default function AdminExpertForm(props: Props) {
  const [state, action, pending] = useActionState(
    props.mode === 'create' ? createExpert : updateExpert, undefined
  )
  const e = props.mode === 'edit' ? props.expert : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Nouvel expert' : 'Modifier l\'expert'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {e && <input type="hidden" name="id" value={e.id} />}

          <Field label="Nom complet" name="name" defaultValue={e?.name} required />
          <Field label="Titre / Fonction" name="title" defaultValue={e?.title} required placeholder="ex: Professeur associé, Dr." />
          <Field label="Institution" name="institution" defaultValue={e?.institution ?? ''} placeholder="ex: Polytechnique, CNRS…" />
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Biographie</label>
            <textarea className="notes-ta" name="bio" defaultValue={e?.bio ?? ''} placeholder="Présentation en quelques phrases…" style={{ fontSize: '13px', minHeight: '80px' }} />
          </div>
          <Field label="URL photo (optionnel)" name="photoUrl" defaultValue={e?.photoUrl ?? ''} placeholder="https://…" />
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
          {('ok' in (state ?? {})) && state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

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
