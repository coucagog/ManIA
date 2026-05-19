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
import { sendTwoFactorCode, sendPasswordResetEmail } from '@/lib/mail'
import crypto from 'crypto'

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

export async function requestPasswordReset(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Adresse e-mail requise.' }

  const user = await prisma.user.findUnique({ where: { email } })
  // Always return ok to avoid user enumeration
  if (!user) return { ok: true }

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expires },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

  if (process.env.SMTP_HOST) {
    await sendPasswordResetEmail(email, resetUrl).catch((err) =>
      console.error('[MANIA RESET] Échec envoi email:', err.message)
    )
  } else {
    console.log(`[MANIA RESET] Lien pour ${email}: ${resetUrl}`)
  }

  return { ok: true }
}

export async function resetPassword(
  _state: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const token = (formData.get('token') as string)?.trim()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!token) return { error: 'Lien invalide.' }
  if (!password || password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  if (password !== confirm) return { error: 'Les mots de passe ne correspondent pas.' }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!record || record.expires < new Date()) {
    return { error: 'Ce lien est invalide ou a expiré. Faites une nouvelle demande.' }
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  })
  await prisma.passwordResetToken.delete({ where: { tokenHash } })

  return { ok: true }
}
