import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED: Record<string, { mime: string[]; maxBytes: number }> = {
  image: { mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], maxBytes: 8 * 1024 * 1024 },
  pdf:   { mime: ['application/pdf'], maxBytes: 20 * 1024 * 1024 },
  video: { mime: ['video/mp4', 'video/webm', 'video/quicktime'], maxBytes: 150 * 1024 * 1024 },
}
// For unconstrained uploads (chapter resources, etc.) — permissive fallback
const DEFAULT_MAX = 200 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const typeHint = (formData.get('type') as string | null) ?? ''

  if (!file || !file.name) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }

  const rule = ALLOWED[typeHint]
  if (rule) {
    if (!rule.mime.includes(file.type)) {
      return NextResponse.json({ error: `Type de fichier non autorisé (${file.type})` }, { status: 400 })
    }
    if (file.size > rule.maxBytes) {
      const mb = Math.round(rule.maxBytes / 1024 / 1024)
      return NextResponse.json({ error: `Fichier trop volumineux (max ${mb} Mo)` }, { status: 400 })
    }
  } else if (file.size > DEFAULT_MAX) {
    return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 400 })
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
