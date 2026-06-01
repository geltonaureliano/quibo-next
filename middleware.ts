import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "qb_session"
const PUBLIC_PATHS = ["/login", "/register"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE)?.value

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isApiAuth = pathname.startsWith("/api/auth")
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico"

  if (isStatic || isApiAuth) return NextResponse.next()

  if (!session && !isPublic) {
    const url = new URL("/login", request.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
