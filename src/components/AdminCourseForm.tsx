'use client'

import { useActionState } from 'react'
import { createCourse, updateCourse, deleteCourse } from '@/app/actions/admin'
import Link from 'next/link'

type CourseData = {
  id: string; title: string; slug: string; speaker: string; parcours: string
  format: string; duration: number; level: string; thumbClass: string
}
type Props = { mode: 'create' } | { mode: 'edit'; course: CourseData }

export default function AdminCourseForm(props: Props) {
  const fn = props.mode === 'create' ? createCourse : updateCourse
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(fn, undefined)
  const c = props.mode === 'edit' ? props.course : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Informations du cours' : 'Modifier le cours'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {c && <input type="hidden" name="id" value={c.id} />}

          <Field label="Titre" name="title" defaultValue={c?.title} required />
          <Field label="Slug (URL)" name="slug" defaultValue={c?.slug} required placeholder="ex: agents-autonomes" />
          <Field label="Intervenant" name="speaker" defaultValue={c?.speaker} required />
          <Field label="Parcours" name="parcours" defaultValue={c?.parcours} required placeholder="ex: Agents Autonomes" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Format" name="format" defaultValue={c?.format} placeholder="Vidéo" />
            <Field label="Durée (min)" name="duration" type="number" defaultValue={String(c?.duration ?? '')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Niveau" name="level" defaultValue={c?.level} placeholder="Avancé" />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Classe thumb</label>
              <select className="f-in" name="thumbClass" defaultValue={c?.thumbClass ?? 't1'} style={{ width: '100%', fontSize: '13px' }}>
                {['t1','t2','t3','t4','t5','t6'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {('ok' in (state ?? {})) && state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? '…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            {props.mode === 'create' && (
              <Link href="/admin/cours" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>Annuler</Link>
            )}
          </div>
        </form>
      </div>

      {c && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteCourse} onSubmit={e => { if (!confirm('Supprimer ce cours et tous ses chapitres ?')) e.preventDefault() }}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer le cours
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
