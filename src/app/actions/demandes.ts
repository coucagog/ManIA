// src/app/actions/demandes.ts
'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SECTEUR_SLUGS } from '@/lib/secteurs'
import { OFFRE_CODES } from '@/lib/offres'

// Reprend exactement la convention de admin.ts
async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

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
  // L'offre est FACULTATIVE : « je ne sais pas encore » est une réponse
  // légitime, et refuser une candidature faute de palier choisi serait absurde.
  const offre = ((formData.get('offre') as string) || '').trim() || null
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
  // ⚠️ Même piège que le secteur (§26) : si le <select> proposait un code
  //    absent de OFFRE_CODES, la candidature serait rejetée en silence. Les
  //    deux dérivent du MÊME fichier src/lib/offres.ts, donc c'est impossible
  //    par construction — cette garde protège des envois forgés, pas de nous.
  if (offre !== null && !OFFRE_CODES.includes(offre)) {
    return { error: 'Offre invalide.' }
  }
  // 🔴 On ne rejette JAMAIS sur le couple (secteur, offre) : un métier à secret
  //    professionnel qui demande un palier hébergé est signalé à l'admin, et
  //    rappelé. Le refuser ici ferait perdre un prospect que la stack locale
  //    sert parfaitement.
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
      nom, email, telephone, organisation, secteur, offre, besoin,
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
// garder la trace protège en cas de contestation (STACK §23).
//
// 🔴 Durcie le 2026-08-15 (STACK-5 §55.1). Avant, un seul clic suffisait, sans
//    aucune confirmation, sur un bouton posé juste sous « → Qualifiée » et
//    « → Refusée » qui servent en routine. Ce clic efface l'horodatage
//    `consentement`, créé en DateTime *précisément* pour prouver QUAND le
//    consentement a été donné (loi 2008-12) — un booléen n'aurait rien prouvé.
//    L'incohérence était interne au projet : le dé-provisionnement exige TROIS
//    barrières, celle-ci n'en avait aucune.
//
// Deux garde-fous, sur le modèle du dé-provisionnement (doctrine STACK-3 §4 :
// confirmation d'interface ET vérification serveur, jamais l'une sans l'autre).
export async function supprimerDemande(
  _state: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin()
  const id = formData.get('id') as string
  const confirmEmail = ((formData.get('confirmEmail') as string) || '')
    .trim()
    .toLowerCase()
  if (!id) return { error: 'Demande introuvable.' }

  const d = await prisma.demandeAgent.findUnique({
    where: { id },
    select: { email: true, tenantSlug: true },
  })
  if (!d) return { error: 'Demande introuvable.' }

  // 🔴 Garde-fou n°1 — LOCATAIRE ORPHELIN (§55.2). `tenantSlug` est le SEUL
  //    lien entre une candidature et le conteneur créé pour elle : l'effacer
  //    laisserait un agent qui tourne, occupe une des 5-6 places de la machine
  //    et garde les données d'un client, sans plus aucune trace dans l'admin.
  //    On ne construit pas /admin/locataires ici, mais on ferme le chemin par
  //    lequel un orphelin se crée.
  //
  // ⚠️ On interroge la table `Tenant`, PAS la chaîne `tenantSlug`. Le
  //    dé-provisionnement supprime la ligne `Tenant` mais laisse `tenantSlug`
  //    renseigné sur la candidature : se fier à la chaîne bloquerait pour
  //    toujours une fiche dont le conteneur n'existe plus — un garde-fou sans
  //    porte de sortie. Mesuré le 2026-08-15 sur le locataire de test `azerty`.
  if (d.tenantSlug) {
    const locataire = await prisma.tenant.findUnique({
      where: { slug: d.tenantSlug },
      select: { slug: true },
    })
    if (locataire) {
      return {
        error:
          `Locataire « ${d.tenantSlug} » encore actif. Dé-provisionnez-le d'abord : ` +
          `sinon l'agent continuerait de tourner sans aucun lien depuis l'admin.`,
      }
    }
  }

  // Garde-fou n°2 — l'e-mail retapé doit correspondre. Il défend contre les
  // deux risques réels : le clic accidentel, et la suppression de la MAUVAISE
  // carte dans une liste où tous les boutons sont identiques.
  if (confirmEmail !== d.email.toLowerCase()) {
    return { error: "L'adresse retapée ne correspond pas à cette candidature." }
  }

  await prisma.demandeAgent.delete({ where: { id } })
  revalidatePath('/admin/demandes')
  return {}
}
