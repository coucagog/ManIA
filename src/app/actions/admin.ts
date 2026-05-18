'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await verifySession()
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}

// ── Users ────────────────────────────────────────────────────────────────

export async function createUser(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = (formData.get('password') as string)
  const role = (formData.get('role') as string) || 'learner'

  if (!name || !email || !password) return { error: 'Tous les champs sont requis.' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'Cet email est déjà utilisé.' }

  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.create({ data: { name, email, password: hashed, initials, role } })
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function updateUser(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const role = (formData.get('role') as string) || 'learner'

  if (!name || !email) return { error: 'Nom et email requis.' }

  const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } })
  if (conflict) return { error: 'Cet email est déjà utilisé.' }

  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  await prisma.user.update({ where: { id }, data: { name, email, role, initials } })
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${id}`)
  return { ok: true }
}

export async function resetUserPassword(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const password = formData.get('password') as string
  if (!password || password.length < 6) return { error: 'Mot de passe trop court (6 car. min).' }
  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id }, data: { password: hashed } })
  return { ok: true }
}

export async function deleteUser(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  await prisma.user.delete({ where: { id } })
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

// ── Courses ──────────────────────────────────────────────────────────────

export async function createCourse(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const title = (formData.get('title') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase().replace(/\s+/g, '-')
  const speaker = (formData.get('speaker') as string).trim()
  const parcours = (formData.get('parcours') as string).trim()
  const format = (formData.get('format') as string).trim()
  const duration = parseInt(formData.get('duration') as string) || 0
  const level = (formData.get('level') as string).trim()
  const thumbClass = (formData.get('thumbClass') as string).trim() || 't1'

  if (!title || !slug || !speaker || !parcours) return { error: 'Titre, slug, intervenant et parcours requis.' }

  const existing = await prisma.course.findUnique({ where: { slug } })
  if (existing) return { error: 'Ce slug est déjà utilisé.' }

  const course = await prisma.course.create({ data: { title, slug, speaker, parcours, format, duration, level, thumbClass } })
  revalidatePath('/admin/cours')
  redirect(`/admin/cours/${course.id}`)
}

export async function updateCourse(_state: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  const id = formData.get('id') as string
  const title = (formData.get('title') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase().replace(/\s+/g, '-')
  const speaker = (formData.get('speaker') as string).trim()
  const parcours = (formData.get('parcours') as string).trim()
  const format = (formData.get('format') as string).trim()
  const duration = parseInt(formData.get('duration') as string) || 0
  const level = (formData.get('level') as string).trim()
  const thumbClass = (formData.get('thumbClass') as string).trim() || 't1'

  if (!title || !slug) return { error: 'Titre et slug requis.' }

  const conflict = await prisma.course.findFirst({ where: { slug, NOT: { id } } })
  if (conflict) return { error: 'Ce slug est déjà utilisé.' }

  await prisma.course.update({ where: { id }, data: { title, slug, speaker, parcours, format, duration, level, thumbClass } })
  revalidatePath('/admin/cours')
  revalidatePath(`/admin/cours/${id}`)
  return { ok: true }
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  await prisma.course.delete({ where: { id } })
  revalidatePath('/admin/cours')
  redirect('/admin/cours')
}

// ── Chapters ─────────────────────────────────────────────────────────────

export async function createChapter(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const courseId = formData.get('courseId') as string
  const title = (formData.get('title') as string).trim()
  const duration = parseInt(formData.get('duration') as string) || 0
  const format = (formData.get('format') as string).trim() || 'Vidéo'

  if (!title) return { error: 'Titre requis.' }

  const last = await prisma.chapter.findFirst({ where: { courseId }, orderBy: { order: 'desc' } })
  const order = (last?.order ?? 0) + 1
  await prisma.chapter.create({ data: { courseId, title, duration, format, order } })
  revalidatePath(`/admin/cours/${courseId}`)
  return { ok: true }
}

export async function updateChapter(_state: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const courseId = formData.get('courseId') as string
  const title = (formData.get('title') as string).trim()
  const duration = parseInt(formData.get('duration') as string) || 0
  const format = (formData.get('format') as string).trim() || 'Vidéo'
  const videoUrl = (formData.get('videoUrl') as string)?.trim() || null
  const content = (formData.get('content') as string)?.trim() || null

  if (!title) return { error: 'Titre requis.' }

  await prisma.chapter.update({ where: { id }, data: { title, duration, format, videoUrl, content } })
  revalidatePath(`/admin/cours/${courseId}`)
  revalidatePath('/cours')
  return { ok: true }
}

export async function deleteChapter(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const courseId = formData.get('courseId') as string
  await prisma.chapter.delete({ where: { id } })
  // Re-number remaining chapters
  const remaining = await prisma.chapter.findMany({ where: { courseId }, orderBy: { order: 'asc' } })
  for (let i = 0; i < remaining.length; i++) {
    await prisma.chapter.update({ where: { id: remaining[i].id }, data: { order: i + 1 } })
  }
  revalidatePath(`/admin/cours/${courseId}`)
}

export async function moveChapter(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const courseId = formData.get('courseId') as string
  const direction = formData.get('direction') as 'up' | 'down'

  const chapters = await prisma.chapter.findMany({ where: { courseId }, orderBy: { order: 'asc' } })
  const idx = chapters.findIndex(c => c.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= chapters.length) return

  const a = chapters[idx], b = chapters[swapIdx]
  await prisma.chapter.update({ where: { id: a.id }, data: { order: b.order } })
  await prisma.chapter.update({ where: { id: b.id }, data: { order: a.order } })
  revalidatePath(`/admin/cours/${courseId}`)
}

// ── Chapter Resources ─────────────────────────────────────────────────────

export async function createResource(formData: FormData) {
  await requireAdmin()
  const chapterId = formData.get('chapterId') as string
  const courseId = formData.get('courseId') as string
  const name = (formData.get('name') as string)?.trim()
  const url = (formData.get('url') as string)?.trim()
  const fileType = (formData.get('fileType') as string)?.trim() || 'file'
  const fileSize = formData.get('fileSize') ? parseInt(formData.get('fileSize') as string) : null
  if (!name || !url) return
  await prisma.chapterResource.create({ data: { chapterId, name, url, fileType, fileSize } })
  revalidatePath(`/admin/cours/${courseId}`)
}

export async function deleteResource(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const courseId = formData.get('courseId') as string
  await prisma.chapterResource.delete({ where: { id } })
  revalidatePath(`/admin/cours/${courseId}`)
}
