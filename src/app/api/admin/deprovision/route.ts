// src/app/api/admin/deprovision/route.ts
//
// Démarre un dé-provisionnement via le démon. Réservé aux ADMIN.
// La confirmation "retape le slug" est faite CÔTÉ UI ; ici on impose que le
// slug du corps corresponde à un champ `confirmSlug` identique (garde-fou serveur
// supplémentaire), puis le démon impose confirm=true.

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { deprovisionStart } from '@/lib/provisiond'

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession()
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let corps: { slug?: string; confirmSlug?: string }
  try {
    corps = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const slug = (corps.slug ?? '').trim().toLowerCase()
  const confirmSlug = (corps.confirmSlug ?? '').trim().toLowerCase()

  if (!slug) {
    return NextResponse.json({ error: 'slug requis' }, { status: 400 })
  }
  // Garde-fou serveur : le slug retapé doit correspondre.
  if (confirmSlug !== slug) {
    return NextResponse.json(
      { error: 'confirmation invalide (le slug retapé ne correspond pas)' },
      { status: 400 },
    )
  }

  try {
    const { status, body } = await deprovisionStart(slug)
    return NextResponse.json(body, { status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `démon injoignable : ${msg}` }, { status: 502 })
  }
}
