'use server'

import { prisma } from '@/lib/db'
import {
  createSession,
  createPendingToken,
  verifyPendingToken,
  deleteSession,
} from '@/lib/session'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { sendTwoFactorCode } from '@/lib/mail'

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function login(
  _state: { error?: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Champs requis.' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'Identifiants invalides.' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'Identifiants invalides.' }

  // Generate 2FA code
  const code = randomCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorCode: code, twoFactorExpires: expires },
  })

  console.log(`[MANIA 2FA] Code pour ${email}: ${code}`)
  if (process.env.SMTP_HOST) {
    await sendTwoFactorCode(email, code).catch((err) =>
      console.error('[MANIA 2FA] Échec envoi email:', err.message)
    )
  }

  const pendingToken = await createPendingToken(user.id)
  const cookieStore = await cookies()
  cookieStore.set('pending_2fa', pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/2fa')
}

export async function verify2fa(
  _state: { error?: string; code?: string } | undefined,
  formData: FormData
): Promise<{ error: string; code?: string }> {
  const digits = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5']
    .map((k) => (formData.get(k) as string | null) ?? '')
    .join('')
    .trim()

  const cookieStore = await cookies()
  const pendingToken = cookieStore.get('pending_2fa')?.value
  if (!pendingToken) return { error: 'Session expirée. Reconnectez-vous.' }

  const userId = await verifyPendingToken(pendingToken)
  if (!userId) return { error: 'Session expirée. Reconnectez-vous.' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Utilisateur introuvable.' }

  console.log('[2FA DEBUG] digits saisis:', JSON.stringify(digits))
  console.log('[2FA DEBUG] code en DB:', JSON.stringify(user.twoFactorCode))
  console.log('[2FA DEBUG] expiry:', user.twoFactorExpires, 'now:', new Date())

  const expires = user.twoFactorExpires
    ? new Date(user.twoFactorExpires as unknown as string)
    : null

  if (
    !user.twoFactorCode ||
    !expires ||
    user.twoFactorCode !== digits ||
    expires < new Date()
  ) {
    const hint =
      process.env.NODE_ENV !== 'production' ? user.twoFactorCode ?? undefined : undefined
    return { error: 'Code invalide ou expiré.', code: hint }
  }

  // Clear 2FA code
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorCode: null, twoFactorExpires: null },
  })
  cookieStore.delete('pending_2fa')

  await createSession(userId, user.role)
  redirect('/dashboard')
}

export async function resend2fa(
  _state: { ok?: boolean; code?: string; error?: string } | undefined,
  _formData: FormData
): Promise<{ ok?: boolean; code?: string; error?: string }> {
  const cookieStore = await cookies()
  const pendingToken = cookieStore.get('pending_2fa')?.value
  if (!pendingToken) return { error: 'Session expirée. Reconnectez-vous.' }

  const userId = await verifyPendingToken(pendingToken)
  if (!userId) return { error: 'Session expirée. Reconnectez-vous.' }

  const code = randomCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorCode: code, twoFactorExpires: expires },
  })

  console.log(`[MANIA 2FA RESEND] Nouveau code: ${code}`)
  if (process.env.SMTP_HOST) {
    const user2 = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user2) {
      await sendTwoFactorCode(user2.email, code).catch((err) =>
        console.error('[MANIA 2FA] Échec renvoi email:', err.message)
      )
    }
  }

  return {
    ok: true,
    code: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
