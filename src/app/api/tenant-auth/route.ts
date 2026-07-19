// src/app/api/tenant-auth/route.ts
//
// Point de terminaison appelé par Traefik (forwardAuth) avant chaque requête
// vers <slug>.mania.sn.
//
//   200 → Traefik laisse passer la requête vers le conteneur du locataire
//   3xx → Traefik renvoie la redirection au navigateur (vers /login)
//   4xx → Traefik renvoie le refus au navigateur
//
// ⚠️ Cette route ne doit PAS être protégée par verifySession() : c'est ELLE
//    qui fait l'authentification. Si un middleware global protège /api/*,
//    il faut l'exclure explicitement.

import { NextRequest, NextResponse } from 'next/server'
import { decryptTenantAccess } from '@/lib/session'
import { prisma } from '@/lib/db'

// Extrait le slug depuis l'hôte demandé : client1.mania.sn -> client1
function slugDepuisHote(hote: string | null): string | null {
  if (!hote) return null
  const nom = hote.split(':')[0].toLowerCase()      // retire le port éventuel
  const suffixe = '.mania.sn'
  if (!nom.endsWith(suffixe)) return null
  const slug = nom.slice(0, -suffixe.length)
  // Mêmes règles que nouveau-tenant.sh — refuse tout ce qui n'est pas un slug propre
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) return null
  return slug
}

export async function GET(req: NextRequest) {
  // Traefik place l'hôte d'origine ici. `req.headers.get('host')` vaudrait
  // le nom du conteneur mania-app : inutilisable.
  const hote = req.headers.get('x-forwarded-host')
  const slug = slugDepuisHote(hote)

  const versLogin = () => {
    const cible = hote ? `https://${hote}/` : 'https://mania.sn/'
    return NextResponse.redirect(
      `https://mania.sn/login?next=${encodeURIComponent(cible)}`,
      { status: 307 },
    )
  }

  if (!slug) {
    return new NextResponse('Hote invalide', { status: 400 })
  }

  const jeton = req.cookies.get('tenant_access')?.value
  const charge = await decryptTenantAccess(jeton)
  if (!charge?.userId) {
    return versLogin()
  }

  // AUTORISATION — le point critique.
  // Vérifier que l'utilisateur est connecté ne suffit pas : sans ce contrôle,
  // n'importe quel utilisateur connecté accéderait à l'agent de n'importe quel
  // autre client.
  const appartenance = await prisma.tenantMember.findFirst({
    where: {
      userId: charge.userId,
      tenant: { slug },
    },
    select: { tenant: { select: { status: true } } },
  })

  if (!appartenance) {
    return new NextResponse('Acces refuse', { status: 403 })
  }

  // Suspension (impayé, fin d'essai) : accès coupé, données intactes.
  if (appartenance.tenant.status === 'suspended') {
    return new NextResponse(
      'Acces suspendu. Contactez mania.sn.',
      { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  }

  return new NextResponse(null, { status: 200 })
}

// Traefik peut relayer d'autres verbes selon la configuration.
export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET
export const HEAD = GET
