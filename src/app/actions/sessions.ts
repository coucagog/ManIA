'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
}

export async function createSession(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const title = (formData.get('title') as string).trim()
  const date = formData.get('date') as string
  const endDate = formData.get('endDate') as string
  const location = (formData.get('location') as string).trim()
  const address = (formData.get('address') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null
  const instructor = (formData.get('instructor') as string).trim()
  const maxSeats = formData.get('maxSeats') ? parseInt(formData.get('maxSeats') as string) : null
  const status = (formData.get('status') as string) || 'upcoming'

  if (!title || !date || !location || !instructor) return { error: 'Titre, date, lieu et intervenant requis.' }

  const s = await prisma.session.create({
    data: {
      title, date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      location, address, description, instructor, maxSeats, status,
    },
  })
  revalidatePath('/presentiel')
  revalidatePath('/admin/sessions')
  redirect(`/admin/sessions/${s.id}`)
}

export async function updateSession(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const id = formData.get('id') as string
  const title = (formData.get('title') as string).trim()
  const date = formData.get('date') as string
  const endDate = formData.get('endDate') as string
  const location = (formData.get('location') as string).trim()
  const address = (formData.get('address') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null
  const instructor = (formData.get('instructor') as string).trim()
  const maxSeats = formData.get('maxSeats') ? parseInt(formData.get('maxSeats') as string) : null
  const status = (formData.get('status') as string) || 'upcoming'

  if (!title || !date || !location) return { error: 'Titre, date et lieu requis.' }

  await prisma.session.update({
    where: { id },
    data: {
      title, date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      location, address, description, instructor, maxSeats, status,
    },
  })
  revalidatePath('/presentiel')
  revalidatePath('/admin/sessions')
  return { ok: true }
}

export async function deleteSession(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  await prisma.session.delete({ where: { id } })
  revalidatePath('/presentiel')
  revalidatePath('/admin/sessions')
  redirect('/admin/sessions')
}

export async function registerForSession(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const { userId } = await verifySession()
  const sessionId = formData.get('sessionId') as string
  if (!sessionId) return { error: 'Session introuvable.' }

  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { registrations: true } } },
  })
  if (!s) return { error: 'Session introuvable.' }
  if (s.status !== 'upcoming') return { error: 'Cette session n\'accepte plus d\'inscriptions.' }
  if (s.maxSeats && s._count.registrations >= s.maxSeats) return { error: 'Cette session est complète.' }

  await prisma.sessionRegistration.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId },
    update: {},
  })

  revalidatePath('/presentiel')
  return { ok: true }
}

export async function unregisterFromSession(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const { userId } = await verifySession()
  const sessionId = formData.get('sessionId') as string
  if (!sessionId) return { error: 'Session introuvable.' }

  await prisma.sessionRegistration.deleteMany({ where: { sessionId, userId } })

  revalidatePath('/presentiel')
  return { ok: true }
}
