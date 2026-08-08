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
    slug?: string; name?: string; sector?: string; ownerEmail?: string
    pack?: string; pii?: boolean
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
  // `=== true` et pas de coercition : seul un vrai booléen force. Une chaîne
  // vide, "false" ou 0 arrivés par erreur ne doivent pas allumer un dispositif
  // dont le coût (latence, CPU du proxy partagé) est réel. Et rien ici ne peut
  // l'ÉTEINDRE : le secteur reste maître de son PII=1.
  const pii = corps.pii === true || undefined

  if (!slug || !name || !ownerEmail) {
    return NextResponse.json(
      { error: 'slug, name et ownerEmail sont requis' },
      { status: 400 },
    )
  }

  try {
    const { status, body } = await provisionStart({ slug, name, ownerEmail, sector, pack, pii })
    return NextResponse.json(body, { status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `démon injoignable : ${msg}` }, { status: 502 })
  }
}
