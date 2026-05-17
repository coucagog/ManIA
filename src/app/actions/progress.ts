'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function markChapterDone(formData: FormData) {
  const session = await verifySession()

  const courseId = formData.get('courseId') as string
  const chapterId = formData.get('chapterId') as string
  const chapterOrder = parseInt(formData.get('chapterOrder') as string) // 1-based
  const totalChapters = parseInt(formData.get('totalChapters') as string)
  const nextChapterId = (formData.get('nextChapterId') as string) || null
  const slug = formData.get('slug') as string

  const newPct = Math.min(100, Math.round((chapterOrder / totalChapters) * 100))

  const existing = await prisma.progress.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId } },
  })

  await prisma.progress.upsert({
    where: { userId_courseId: { userId: session.userId, courseId } },
    update: {
      percentage: Math.max(existing?.percentage ?? 0, newPct),
      lastChapterId: nextChapterId ?? chapterId,
    },
    create: {
      userId: session.userId,
      courseId,
      percentage: newPct,
      lastChapterId: nextChapterId ?? chapterId,
    },
  })

  if (nextChapterId) {
    redirect(`/cours/${slug}?ch=${nextChapterId}`)
  } else {
    redirect(`/cours/${slug}`)
  }
}
