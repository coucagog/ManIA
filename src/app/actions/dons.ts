'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
}

export async function createDonationMethod(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string)?.trim() || null
  const qrUrl = (formData.get('qrUrl') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const order = parseInt(formData.get('order') as string) || 0

  if (!name) return { error: 'Nom requis.' }
  if (!phone && !qrUrl) return { error: 'Au moins un numéro ou un QR code requis.' }

  await prisma.donationMethod.create({ data: { name, phone, qrUrl, description, order } })
  revalidatePath('/dons')
  revalidatePath('/admin/dons')
  redirect('/admin/dons')
}

export async function updateDonationMethod(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string)?.trim() || null
  const qrUrl = (formData.get('qrUrl') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const order = parseInt(formData.get('order') as string) || 0
  const active = formData.get('active') === 'on'

  if (!name) return { error: 'Nom requis.' }

  await prisma.donationMethod.update({ where: { id }, data: { name, phone, qrUrl, description, order, active } })
  revalidatePath('/dons')
  revalidatePath('/admin/dons')
  return { ok: true }
}

export async function deleteDonationMethod(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  await prisma.donationMethod.delete({ where: { id } })
  revalidatePath('/dons')
  revalidatePath('/admin/dons')
  redirect('/admin/dons')
}
