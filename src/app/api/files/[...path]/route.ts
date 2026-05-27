import { NextRequest, NextResponse } from 'next/server'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { Readable } from 'stream'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
}

function nodeToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() { nodeStream.destroy() },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  // Prevent path traversal
  const filename = segments.join('/')
  const resolved = path.resolve(UPLOAD_DIR, filename)
  if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let fileSize: number
  try {
    fileSize = (await stat(resolved)).size
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = path.extname(filename).slice(1).toLowerCase()
  const contentType = MIME[ext] ?? 'application/octet-stream'
  const rangeHeader = req.headers.get('range')

  // Support HTTP Range requests — required for video/audio seeking in browsers
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    return new NextResponse(
      nodeToWeb(createReadStream(resolved, { start, end })),
      {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      }
    )
  }

  return new NextResponse(
    nodeToWeb(createReadStream(resolved)),
    {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
