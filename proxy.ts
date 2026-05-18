import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import { cookies } from 'next/headers'

const protectedRoutes = ['/dashboard', '/cours', '/catalogue', '/profil', '/presentiel', '/experts', '/dons']
const adminRoutes = ['/admin']
const publicRoutes = ['/login', '/2fa']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtected = protectedRoutes.some(r => path.startsWith(r))
  const isAdmin = adminRoutes.some(r => path.startsWith(r))
  const isPublic = publicRoutes.some(r => path.startsWith(r))

  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if ((isProtected || isAdmin) && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAdmin && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (isPublic && session?.userId && path !== '/2fa') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)'],
}
