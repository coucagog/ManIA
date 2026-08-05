// src/app/api/admin/jobs/[id]/route.ts
//
// État d'un job de provisioning/dé-provisioning. Réservé aux ADMIN.
// (Next 15 : params est asynchrone.)

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { jobStatus } from '@/lib/provisiond'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySession()
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  try {
    const { status, body } = await jobStatus(id)
    return NextResponse.json(body, { status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `démon injoignable : ${msg}` }, { status: 502 })
  }
}
