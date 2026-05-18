'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
}

export async function createExpert(_state: { error?: string } | undefined, formData: FormData) {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  const title = (formData.get('title') as string).trim()
  const institution = (formData.get('institution') as string | null)?.trim() || null
  const bio = (formData.get('bio') as string | null)?.trim() || null
  const photoUrl = (formData.get('photoUrl') as string | null)?.trim() || null
  const speakerKey = (formData.get('speakerKey') as string | null)?.trim() || null
  const order = parseInt(formData.get('order') as string) || 0

  if (!name || !title) return { error: 'Nom et titre requis.' }

  const e = await prisma.expert.create({ data: { name, title, institution, bio, photoUrl, speakerKey, order } })
  revalidatePath('/experts')
  revalidatePath('/admin/experts')
  redirect(`/admin/experts/${e.id}`)
}

export async function updateExpert(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const title = (formData.get('title') as string).trim()
  const institution = (formData.get('institution') as string | null)?.trim() || null
  const bio = (formData.get('bio') as string | null)?.trim() || null
  const photoUrl = (formData.get('photoUrl') as string | null)?.trim() || null
  const speakerKey = (formData.get('speakerKey') as string | null)?.trim() || null
  const order = parseInt(formData.get('order') as string) || 0

  if (!name || !title) return { error: 'Nom et titre requis.' }

  await prisma.expert.update({ where: { id }, data: { name, title, institution, bio, photoUrl, speakerKey, order } })
  revalidatePath('/experts')
  revalidatePath('/admin/experts')
  return { ok: true }
}

export async function deleteExpert(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  await prisma.expert.delete({ where: { id } })
  revalidatePath('/experts')
  revalidatePath('/admin/experts')
  redirect('/admin/experts')
}
