'use client'

import { useActionState, useRef, useState } from 'react'
import { createDonationMethod, updateDonationMethod, deleteDonationMethod } from '@/app/actions/dons'
import Link from 'next/link'

type DonationData = {
  id: string; name: string; phone: string | null; qrUrl: string | null
  description: string | null; active: boolean; order: number
}
type Props = { mode: 'create' } | { mode: 'edit'; method: DonationData }

export default function AdminDonationForm(props: Props) {
  const fn = props.mode === 'create' ? createDonationMethod : updateDonationMethod
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(fn, undefined)
  const m = props.mode === 'edit' ? props.method : null

  const qrRef = useRef<HTMLInputElement>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const [qrName, setQrName] = useState<string | null>(null)

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (qrRef.current) qrRef.current.value = json.url
    setQrName(file.name)
    setQrUploading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Nouveau moyen de don' : 'Modifier'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {m && <input type="hidden" name="id" value={m.id} />}

          <Field label="Nom du service" name="name" defaultValue={m?.name} required placeholder="ex: Orange Money, Wave, Free Money…" />
          <Field label="Numéro de téléphone" name="phone" defaultValue={m?.phone ?? ''} placeholder="+221 77 000 00 00" />

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>QR Code</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                ref={qrRef}
                className="f-in" name="qrUrl" defaultValue={m?.qrUrl ?? ''}
                placeholder="URL du QR code ou uploader une image…"
                style={{ flex: 1, fontSize: '13px' }}
              />
              <label style={{
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
                padding: '0 10px', height: '36px', background: 'var(--inset)',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                cursor: qrUploading ? 'default' : 'pointer', whiteSpace: 'nowrap', color: 'var(--muted)',
              }}>
                {qrUploading ? '…' : '↑ Image'}
                <input type="file" accept="image/*" onChange={handleQrUpload} disabled={qrUploading} style={{ display: 'none' }} />
              </label>
            </div>
            {qrName && <div style={{ fontSize: '11px', color: 'var(--coral)', marginTop: '3px' }}>✓ {qrName} uploadé</div>}
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Instructions (optionnel)</label>
            <textarea className="notes-ta" name="description" defaultValue={m?.description ?? ''} placeholder="Précisions pour l'utilisateur…" style={{ fontSize: '13px', minHeight: '70px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px', alignItems: 'end' }}>
            <Field label="Ordre" name="order" type="number" defaultValue={String(m?.order ?? 0)} />
            {m && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
                <input type="checkbox" name="active" id="active" defaultChecked={m.active} style={{ cursor: 'pointer' }} />
                <label htmlFor="active" style={{ fontSize: '13px', cursor: 'pointer' }}>Actif (visible sur la page dons)</label>
              </div>
            )}
          </div>

          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? '…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            {props.mode === 'create' && (
              <Link href="/admin/dons" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>Annuler</Link>
            )}
          </div>
        </form>
      </div>

      {m && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteDonationMethod} onSubmit={ev => { if (!confirm('Supprimer ce moyen de don ?')) ev.preventDefault() }}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer
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
