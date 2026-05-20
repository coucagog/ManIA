import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSessionReminder24h, sendSessionReminder2h } from '@/lib/mail'

// Windows around the target times, sized to tolerate irregular cron runs.
// Cron runs every hour; windows are wider than 1h to be safe.
const WINDOW_24H = { minMs: 20 * 3600_000, maxMs: 28 * 3600_000 }
const WINDOW_2H  = { minMs:  1 * 3600_000, maxMs:  3 * 3600_000 }

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = Date.now()
  const results = { '24h': { sent: 0, skipped: 0 }, '2h': { sent: 0, skipped: 0 } }

  const jobs: Array<{ type: '24h' | '2h'; window: typeof WINDOW_24H }> = [
    { type: '24h', window: WINDOW_24H },
    { type: '2h',  window: WINDOW_2H  },
  ]

  for (const { type, window } of jobs) {
    const from = new Date(now + window.minMs)
    const to   = new Date(now + window.maxMs)

    const sessions = await prisma.session.findMany({
      where: {
        status: 'upcoming',
        date: { gte: from, lte: to },
      },
      include: {
        registrations: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    for (const s of sessions) {
      // Find already-sent reminders of this type for this session
      const sent = await prisma.sessionReminder.findMany({
        where: { sessionId: s.id, type },
        select: { userId: true },
      })
      const sentUserIds = new Set(sent.map(r => r.userId))

      for (const reg of s.registrations) {
        const { id: userId, name, email } = reg.user
        if (sentUserIds.has(userId)) {
          results[type].skipped++
          continue
        }

        try {
          if (type === '24h') {
            await sendSessionReminder24h(email, name, s)
          } else {
            await sendSessionReminder2h(email, name, s)
          }
          await prisma.sessionReminder.create({ data: { sessionId: s.id, userId, type } })
          results[type].sent++
        } catch (err) {
          console.error(`[MANIA CRON] Échec rappel ${type} → ${email}:`, (err as Error).message)
        }
      }
    }
  }

  console.log('[MANIA CRON]', new Date().toISOString(), JSON.stringify(results))
  return NextResponse.json({ ok: true, results })
}
