import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup') ||
    req.nextUrl.pathname.startsWith('/verify-email')
  const isPublicPage = req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/api/webhook')

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
