'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function updateProfile(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await verifySession()
  const name = (formData.get('name') as string).trim()
  const photoUrl = (formData.get('photoUrl') as string)?.trim() || null

  if (!name || name.length < 2) return { error: 'Nom trop court (2 caractères minimum).' }

  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  await prisma.user.update({ where: { id: session.userId }, data: { name, initials, photoUrl } })
  revalidatePath('/profil')
  return { ok: true }
}

export async function changePassword(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await verifySession()
  const current = formData.get('current') as string
  const next = formData.get('new') as string
  const confirm = formData.get('confirm') as string

  if (!current || !next || !confirm) return { error: 'Tous les champs sont requis.' }
  if (next !== confirm) return { error: 'Les mots de passe ne correspondent pas.' }
  if (next.length < 8) return { error: 'Minimum 8 caractères.' }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return { error: 'Utilisateur introuvable.' }

  const valid = await bcrypt.compare(current, user.password)
  if (!valid) return { error: 'Mot de passe actuel incorrect.' }

  const hash = await bcrypt.hash(next, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } })

  return { ok: true }
}
