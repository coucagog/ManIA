'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateProgress(courseId: string, percentage: number, lastChapterId?: string) {
  const session = await verifySession()
  await prisma.progress.upsert({
    where: { userId_courseId: { userId: session.userId, courseId } },
    update: { percentage, lastChapterId },
    create: { userId: session.userId, courseId, percentage, lastChapterId },
  })
  revalidatePath('/dashboard')
}

export async function saveNote(chapterId: string, content: string, timecode?: string) {
  const session = await verifySession()
  await prisma.note.create({
    data: { userId: session.userId, chapterId, content, timecode },
  })
}
