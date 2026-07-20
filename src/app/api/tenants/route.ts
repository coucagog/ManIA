// src/app/api/tenants/route.ts
//
// Création d'un locataire (Tenant + TenantMember owner), appelée par le service
// de provisioning (`nouveau-tenant.sh`) sur le VPS.
//
// 🔴 PROTECTION OBLIGATOIRE
// Les conteneurs des clients sont sur le réseau `web` et peuvent donc joindre
// http://mania-app-1:3000. Sans secret partagé, un agent client pourrait créer
// ses propres locataires ou s'ajouter comme membre chez un concurrent.
// Le secret vit dans /opt/mania/.env (0600) et dans /opt/hermes/gabarit/
// (root uniquement) — jamais dans un conteneur client.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const SLUGS_RESERVES = ['mania', 'traefik', 'www', 'api', 'admin', 'app', 'mail']

export async function POST(req: NextRequest) {
  // --- Authentification du service ------------------------------------------
  const attendu = process.env.PROVISIONING_SECRET
  if (!attendu) {
    // Fail-closed : sans secret configuré, la route est inutilisable.
    return NextResponse.json(
      { error: 'PROVISIONING_SECRET non configuré côté serveur' },
      { status: 503 },
    )
  }
  const fourni = req.headers.get('x-provisioning-secret')
  if (!fourni || fourni !== attendu) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // --- Lecture et validation -------------------------------------------------
  let corps: { slug?: string; name?: string; ownerEmail?: string; pack?: string }
  try {
    corps = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const slug = (corps.slug ?? '').trim().toLowerCase()
  const name = (corps.name ?? '').trim()
  const ownerEmail = (corps.ownerEmail ?? '').trim().toLowerCase()
  const pack = (corps.pack ?? 'generique').trim()

  // Mêmes règles que nouveau-tenant.sh : le slug sert de sous-domaine,
  // de nom de conteneur, de réseau ET de routeur Traefik.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return NextResponse.json({ error: 'slug invalide' }, { status: 400 })
  }
  if (SLUGS_RESERVES.includes(slug)) {
    return NextResponse.json({ error: `slug réservé : ${slug}` }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'name requis' }, { status: 400 })
  }
  if (!ownerEmail) {
    return NextResponse.json({ error: 'ownerEmail requis' }, { status: 400 })
  }

  // --- Le propriétaire doit exister ------------------------------------------
  // On ne crée PAS le compte ici : l'inscription passe par le parcours normal
  // (mot de passe, 2FA). Un locataire sans propriétaire valide serait orphelin
  // et inaccessible.
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  })
  if (!owner) {
    return NextResponse.json(
      { error: `aucun utilisateur avec l'email ${ownerEmail}` },
      { status: 404 },
    )
  }

  // --- Idempotence -----------------------------------------------------------
  // Le script de provisioning peut être relancé après un échec partiel.
  const existant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, status: true },
  })
  if (existant) {
    const dejaMembre = await prisma.tenantMember.findFirst({
      where: { tenantId: existant.id, userId: owner.id },
      select: { id: true },
    })
    if (!dejaMembre) {
      await prisma.tenantMember.create({
        data: { tenantId: existant.id, userId: owner.id, role: 'owner' },
      })
    }
    return NextResponse.json(
      { ...existant, cree: false, message: 'locataire déjà existant' },
      { status: 200 },
    )
  }

  // --- Création --------------------------------------------------------------
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name,
      pack,
      status: 'active',
      members: { create: { userId: owner.id, role: 'owner' } },
    },
    select: { id: true, slug: true, name: true, pack: true, status: true },
  })

  return NextResponse.json({ ...tenant, cree: true }, { status: 201 })
}
