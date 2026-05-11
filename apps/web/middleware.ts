import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { TokenPayload } from '@plantoes-medicos/types'

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as TokenPayload
  } catch {
    return null
  }
}

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('accessToken')?.value
  if (cookieToken) return cookieToken

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = getTokenFromRequest(request)
  const payload = token ? decodeJwtPayload(token) : null
  const isAuthenticated = payload !== null && payload.exp * 1000 > Date.now()

  const isAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/cadastro')

  if (isAuthPage && isAuthenticated) {
    const role = payload!.role
    const dashboardMap: Record<string, string> = {
      HOSPITAL: '/hospital/dashboard',
      PROFESSIONAL: '/profissional/dashboard',
      ADMIN: '/admin/dashboard',
    }
    return NextResponse.redirect(
      new URL(dashboardMap[role] ?? '/login', request.url)
    )
  }

  if (pathname.startsWith('/hospital')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload!.role !== 'HOSPITAL') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/profissional')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload!.role !== 'PROFESSIONAL') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload!.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/hospital/:path*',
    '/profissional/:path*',
    '/admin/:path*',
    '/login',
    '/cadastro/:path*',
  ],
}
