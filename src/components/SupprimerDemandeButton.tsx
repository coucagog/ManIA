'use client'

// src/components/SupprimerDemandeButton.tsx
//
// Suppression IRRÉVERSIBLE d'une candidature — réservée au spam (STACK §23).
// Calqué sur DeprovisionButton : le bouton nu n'agit pas, il ouvre une
// confirmation où il faut retaper la valeur qui identifie l'enregistrement.
//
// 🔴 Pourquoi l'e-mail et pas un simple « oui » : dans cette liste, toutes les
//    cartes portent les mêmes boutons au même endroit. Retaper l'adresse
//    affichée sur la carte défend contre le clic accidentel ET contre la
//    suppression de la mauvaise candidature.

import { useActionState, useState } from 'react'
import { supprimerDemande } from '@/app/actions/demandes'

export function SupprimerDemandeButton({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState(supprimerDemande, undefined)
  const [ouvert, setOuvert] = useState(false)
  const [saisi, setSaisi] = useState('')

  if (!ouvert) {
    return (
      <button
        className="adm-btn adm-btn--danger"
        type="button"
        onClick={() => setOuvert(true)}
      >
        Supprimer (spam)
      </button>
    )
  }

  return (
    <form action={action} className="adm-confirm">
      <input type="hidden" name="id" value={id} />
      <span>
        Suppression <strong>IRRÉVERSIBLE</strong> — elle efface aussi la preuve
        horodatée du consentement. Une candidature légitime se marque
        « Refusée ». Retape <code>{email}</code>{' '}pour confirmer :
      </span>
      <input
        className="adm-input"
        type="text"
        name="confirmEmail"
        value={saisi}
        onChange={e => setSaisi(e.target.value.toLowerCase())}
        placeholder={email}
        disabled={pending}
        autoComplete="off"
      />
      <button
        className="adm-btn adm-btn--danger"
        type="submit"
        disabled={saisi !== email.toLowerCase() || pending}
      >
        {pending ? 'Suppression…' : 'Confirmer la suppression'}
      </button>
      <button
        className="adm-btn"
        type="button"
        disabled={pending}
        onClick={() => {
          setOuvert(false)
          setSaisi('')
        }}
      >
        Annuler
      </button>
      {state?.error && (
        <p className="adm-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
