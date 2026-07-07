import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { SESSION_COOKIE, verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE)?.value
	const ok = await verifyToken(token, process.env.DASH_COOKIE_SECRET ?? '')
	if (!ok) {
		return NextResponse.redirect(new URL('/login', request.url))
	}
	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)']
}
