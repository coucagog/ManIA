// src/app/actions/demandes.ts
'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Reprend exactement la convention de admin.ts
async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

const SECTEURS = ['ophtalmo', 'optique', 'sante', 'autre']
const STATUTS = ['nouvelle', 'qualifiee', 'acceptee', 'refusee']

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC — aucune authentification
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 Cette action est exposée à Internet. Trois protections :
//   1. Un champ-piège invisible (les robots le remplissent, pas les humains).
//   2. Une limite : une demande en attente par email suffit.
//   3. AUCUN envoi d'email. Le prospect ne reçoit rien tant que MLS n'a pas
//      validé — sinon le serveur SMTP devient un relais à spam et le domaine
//      finit sur les listes noires.
export async function creerDemande(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  // 1. Champ-piège
  if ((formData.get('site') as string)?.trim()) {
    // On répond "ok" sans rien enregistrer : inutile de renseigner le robot.
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
  if (!SECTEURS.includes(secteur)) {
    return { error: 'Secteur invalide.' }
  }
  // Le consentement est OBLIGATOIRE et sa date est enregistrée (loi 2008-12).
  if (!consent) {
    return { error: 'Le consentement au traitement des données est requis.' }
  }

  // 2. Une seule demande en attente par email
  const enAttente = await prisma.demandeAgent.findFirst({
    where: { email, statut: { in: ['nouvelle', 'qualifiee'] } },
    select: { id: true },
  })
  if (enAttente) {
    return {
      error: 'Une demande est déjà en cours pour cette adresse. Nous vous recontactons bientôt.',
    }
  }

  await prisma.demandeAgent.create({
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
export async function changerStatutDemande(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const statut = formData.get('statut') as string
  if (!id || !STATUTS.includes(statut)) return

  await prisma.demandeAgent.update({
    where: { id },
    data: {
      statut,
      traiteeAt: statut === 'nouvelle' ? null : new Date(),
    },
  })
  revalidatePath('/admin/demandes')
}

export async function enregistrerNote(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const noteInterne = ((formData.get('noteInterne') as string) || '').trim() || null
  if (!id) return

  await prisma.demandeAgent.update({ where: { id }, data: { noteInterne } })
  revalidatePath('/admin/demandes')
}

export async function lierLocataire(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const tenantSlug = ((formData.get('tenantSlug') as string) || '').trim().toLowerCase() || null
  if (!id) return
  if (tenantSlug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenantSlug)) return

  await prisma.demandeAgent.update({
    where: { id },
    data: { tenantSlug, statut: 'acceptee', traiteeAt: new Date() },
  })
  revalidatePath('/admin/demandes')
}

// ⚠️ Suppression définitive — à n'utiliser que pour le spam.
// Une demande légitime se marque "refusee", elle ne se supprime pas :
// garder la trace protège en cas de contestation.
export async function supprimerDemande(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return
  await prisma.demandeAgent.delete({ where: { id } })
  revalidatePath('/admin/demandes')
}
