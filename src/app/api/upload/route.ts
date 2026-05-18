import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || !file.name) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = path.extname(file.name).toLowerCase()
  const filename = `${randomUUID()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${filename}`, name: file.name, size: file.size })
}
