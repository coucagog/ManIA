'use client'

import { useActionState } from 'react'
import { createUser, updateUser, resetUserPassword, deleteUser } from '@/app/actions/admin'
import Link from 'next/link'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; user: { id: string; name: string; email: string; role: string } }

export default function AdminUserForm(props: Props) {
  const [state, action, pending] = useActionState(
    props.mode === 'create' ? createUser : updateUser,
    undefined
  )
  const [pwState, pwAction, pwPending] = useActionState(resetUserPassword, undefined)

  const user = props.mode === 'edit' ? props.user : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Main form */}
      <div className="sec-card">
        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          {props.mode === 'create' ? 'Créer un compte' : 'Informations'}
        </div>
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {user && <input type="hidden" name="id" value={user.id} />}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Nom complet</label>
            <input className="f-in" name="name" defaultValue={user?.name} required style={{ width: '100%', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Email</label>
            <input className="f-in" name="email" type="email" defaultValue={user?.email} required style={{ width: '100%', fontSize: '13px' }} />
          </div>
          {props.mode === 'create' && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', borderRadius: '8px', padding: '10px 14px' }}>
              Un email sera envoyé à l&apos;utilisateur pour qu&apos;il définisse son mot de passe.
            </p>
          )}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Rôle</label>
            <select className="f-in" name="role" defaultValue={user?.role ?? 'learner'} style={{ width: '100%', fontSize: '13px' }}>
              <option value="learner">Apprenant</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {state?.error && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>{state.error}</p>}
          {state?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px' }}>✓ Enregistré</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn-done" disabled={pending} style={{ fontSize: '12px', padding: '8px 16px' }}>
              {pending ? 'Enregistrement…' : props.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
            {props.mode === 'create' && (
              <Link href="/admin/users" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>Annuler</Link>
            )}
          </div>
        </form>
      </div>

      {/* Password reset (edit only) */}
      {user && (
        <div className="sec-card">
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>Réinitialiser le mot de passe</div>
          <form action={pwAction} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <input type="hidden" name="id" value={user.id} />
            <div style={{ flex: 1 }}>
              <input className="f-in" name="password" type="password" placeholder="Nouveau mot de passe" minLength={6} required style={{ width: '100%', fontSize: '13px' }} />
            </div>
            <button type="submit" className="btn-ghost" disabled={pwPending} style={{ fontSize: '12px', padding: '8px 14px', whiteSpace: 'nowrap' }}>
              {pwPending ? '…' : 'Appliquer'}
            </button>
          </form>
          {pwState?.error && <p style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '8px' }}>{pwState.error}</p>}
          {pwState?.ok && <p style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '8px' }}>✓ Mot de passe mis à jour</p>}
        </div>
      )}

      {/* Delete (edit only) */}
      {user && (
        <div className="sec-card" style={{ borderTop: '2px solid var(--coral)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Zone dangereuse</div>
          <form action={deleteUser} onSubmit={e => { if (!confirm('Supprimer définitivement cet utilisateur ?')) e.preventDefault() }}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1px solid var(--coral)', color: 'var(--coral)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
              Supprimer l&apos;utilisateur
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
