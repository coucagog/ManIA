'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function saveNote(
  _state: { ok?: boolean } | undefined,
  formData: FormData
): Promise<{ ok: boolean }> {
  const session = await verifySession()
  const chapterId = formData.get('chapterId') as string
  const content = (formData.get('content') as string ?? '').trim()
  const slug = formData.get('slug') as string

  const existing = await prisma.note.findFirst({
    where: { userId: session.userId, chapterId },
  })

  if (!content) {
    if (existing) await prisma.note.delete({ where: { id: existing.id } })
  } else if (existing) {
    await prisma.note.update({ where: { id: existing.id }, data: { content } })
  } else {
    await prisma.note.create({
      data: { userId: session.userId, chapterId, content },
    })
  }

  revalidatePath(`/cours/${slug}`)
  return { ok: true }
}
