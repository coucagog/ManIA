import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export type SessionPayload = {
  userId: string
  role: string
  expiresAt: Date
}

export type TenantAccessPayload = {
  userId: string
}

// Jeton d'accès aux sous-domaines locataires.
// Volontairement MINIMAL (userId seul) et court (24 h) : il transite vers des
// conteneurs où du code client s'exécute. Il ne doit jamais suffire à se faire
// passer pour l'utilisateur sur mania.sn.
export async function encryptTenantAccess(payload: TenantAccessPayload) {
  return new SignJWT({ ...payload, aud: 'tenant' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey)
}

export async function decryptTenantAccess(token: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
      audience: 'tenant',   // refuse un cookie `session` présenté à la place
    })
    return payload as unknown as TenantAccessPayload
  } catch {
    return null
  }
}

const secretKey = process.env.SESSION_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as SessionPayload
  } catch {
    return null
  }
}

/* export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, expiresAt })
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
} */

export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, expiresAt })
  const cookieStore = await cookies()

  // Cookie principal — reste sur mania.sn, JAMAIS envoyé aux locataires
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  // Cookie d'accès locataire — porté sur tous les sous-domaines
  const tenantExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tenantToken = await encryptTenantAccess({ userId })
  cookieStore.set('tenant_access', tenantToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: tenantExpires,
    sameSite: 'lax',
    path: '/',
    domain: '.mania.sn',
  })
}

/* export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
} */

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  cookieStore.delete({ name: 'tenant_access', domain: '.mania.sn', path: '/' })
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  return decrypt(session)
}

export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) redirect('/login')
  return { isAuth: true, userId: session.userId, role: session.role }
})

// Temporary 2FA pending token (short-lived, 10 min)
export async function createPendingToken(userId: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  return new SignJWT({ userId, pending: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(encodedKey)
}

export async function verifyPendingToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    if (!payload.pending) return null
    return payload.userId as string
  } catch {
    return null
  }
}
