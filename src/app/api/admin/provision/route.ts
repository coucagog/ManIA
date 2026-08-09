// src/app/api/admin/provision/route.ts
//
// Démarre un provisioning via le démon. Réservé aux ADMIN (session).
// Renvoie { job_id } — le client sonde ensuite /api/admin/jobs/[id].

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { provisionStart } from '@/lib/provisiond'

async function requireAdmin(): Promise<boolean> {
  try {
    const session = await verifySession()
    return session?.role === 'admin'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let corps: {
    slug?: string; name?: string; sector?: string; ownerEmail?: string; pack?: string
  }
  try {
    corps = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const slug = (corps.slug ?? '').trim().toLowerCase()
  const name = (corps.name ?? '').trim()
  const ownerEmail = (corps.ownerEmail ?? '').trim().toLowerCase()
  const sector = (corps.sector ?? '').trim() || undefined
  const pack = (corps.pack ?? '').trim() || undefined

  if (!slug || !name || !ownerEmail) {
    return NextResponse.json(
      { error: 'slug, name et ownerEmail sont requis' },
      { status: 400 },
    )
  }

  try {
    const { status, body } = await provisionStart({ slug, name, ownerEmail, sector, pack })
    return NextResponse.json(body, { status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `démon injoignable : ${msg}` }, { status: 502 })
  }
}
