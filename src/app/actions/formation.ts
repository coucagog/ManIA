// src/app/actions/formation.ts
//
// Demandes d'accès à la plateforme de formation. Calqué sur actions/demandes.ts
// (candidatures agent) : mêmes garde-fous, même workflow admin.
'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SECTEUR_SLUGS } from '@/lib/secteurs'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

const STATUTS = ['nouvelle', 'qualifiee', 'acceptee', 'refusee']

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC — aucune authentification
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 Action exposée à Internet. Trois protections (identiques à creerDemande) :
//   1. Champ-piège invisible (les robots le remplissent, pas les humains).
//   2. Une seule demande en attente par email.
//   3. AUCUN envoi d'email — sinon le SMTP devient un relais à spam.
export async function creerDemandeFormation(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  // 1. Champ-piège
  if ((formData.get('site') as string)?.trim()) {
    return { ok: true }
  }

  const nom = ((formData.get('nom') as string) || '').trim()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const telephone = ((formData.get('telephone') as string) || '').trim() || null
  const organisation = ((formData.get('organisation') as string) || '').trim() || null
  const secteur = ((formData.get('secteur') as string) || 'autre').trim()
  const besoin = ((formData.get('besoin') as string) || '').trim()
  const consent = formData.get('consentement')

  if (!nom || !email || !besoin) {
    return { error: 'Nom, email et description du besoin sont requis.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'Adresse email invalide.' }
  }
  if (nom.length > 120 || besoin.length > 4000) {
    return { error: 'Champs trop longs.' }
  }
  if (!SECTEUR_SLUGS.includes(secteur)) {
    return { error: 'Secteur invalide.' }
  }
  // Le consentement est OBLIGATOIRE et sa date est enregistrée (loi 2008-12).
  if (!consent) {
    return { error: 'Le consentement au traitement des données est requis.' }
  }

  // 2. Une seule demande en attente par email
  const enAttente = await prisma.demandeFormation.findFirst({
    where: { email, statut: { in: ['nouvelle', 'qualifiee'] } },
    select: { id: true },
  })
  if (enAttente) {
    return {
      error: 'Une demande est déjà en cours pour cette adresse. Nous vous recontactons bientôt.',
    }
  }

  await prisma.demandeFormation.create({
    data: {
      nom, email, telephone, organisation, secteur, besoin,
      consentement: new Date(),
    },
  })

  // 3. Volontairement AUCUN email envoyé ici.
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════════════════
export async function changerStatutDemandeFormation(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const statut = formData.get('statut') as string
  if (!id || !STATUTS.includes(statut)) return

  await prisma.demandeFormation.update({
    where: { id },
    data: {
      statut,
      traiteeAt: statut === 'nouvelle' ? null : new Date(),
    },
  })
  revalidatePath('/admin/demandes-formation')
}

export async function noterDemandeFormation(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const noteInterne = ((formData.get('noteInterne') as string) || '').trim() || null
  if (!id) return

  await prisma.demandeFormation.update({ where: { id }, data: { noteInterne } })
  revalidatePath('/admin/demandes-formation')
}

// ⚠️ Suppression définitive — réservée au spam. Une demande légitime se
// marque "refusee" : garder la trace protège en cas de contestation.
export async function supprimerDemandeFormation(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return
  await prisma.demandeFormation.delete({ where: { id } })
  revalidatePath('/admin/demandes-formation')
}
