'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unlink } from 'fs/promises'
import path from 'path'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
}

async function deleteUploadedFile(url: string | null | undefined) {
  if (!url || !url.startsWith('/uploads/')) return
  const filename = url.slice('/uploads/'.length)
  const resolved = path.resolve(process.cwd(), 'public', 'uploads', filename)
  // Prevent path traversal
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
  if (!resolved.startsWith(uploadsDir + path.sep)) return
  try { await unlink(resolved) } catch { /* already gone — fine */ }
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

  const mediaUrl = (formData.get('mediaUrl') as string | null)?.trim() || null
  const mediaType = (formData.get('mediaType') as string | null)?.trim() || null

  if (!title || !date || !location || !instructor) return { error: 'Titre, date, lieu et intervenant requis.' }

  const s = await prisma.session.create({
    data: {
      title, date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      location, address, description, instructor, maxSeats, status,
      mediaUrl: mediaUrl || null,
      mediaType: mediaUrl ? mediaType : null,
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

  const mediaUrl = (formData.get('mediaUrl') as string | null)?.trim() || null
  const mediaType = (formData.get('mediaType') as string | null)?.trim() || null

  if (!title || !date || !location) return { error: 'Titre, date et lieu requis.' }

  // Delete old file if it changed or was removed
  const old = await prisma.session.findUnique({ where: { id }, select: { mediaUrl: true } })
  if (old?.mediaUrl && old.mediaUrl !== (mediaUrl || null)) {
    await deleteUploadedFile(old.mediaUrl)
  }

  await prisma.session.update({
    where: { id },
    data: {
      title, date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      location, address, description, instructor, maxSeats, status,
      mediaUrl: mediaUrl || null,
      mediaType: mediaUrl ? mediaType : null,
    },
  })
  revalidatePath('/presentiel')
  revalidatePath('/admin/sessions')
  return { ok: true }
}

export async function deleteSession(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const s = await prisma.session.findUnique({ where: { id }, select: { mediaUrl: true } })
  await prisma.session.delete({ where: { id } })
  await deleteUploadedFile(s?.mediaUrl)
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
