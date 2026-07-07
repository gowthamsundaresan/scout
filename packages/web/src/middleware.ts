import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { SESSION_COOKIE, verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE)?.value
	const ok = await verifyToken(token, process.env.DASH_COOKIE_SECRET ?? '')
	if (!ok) {
		// API callers get a parseable 401; a 307 would make fetch() re-POST into /login
		if (request.nextUrl.pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
		}
		return NextResponse.redirect(new URL('/login', request.url))
	}
	return NextResponse.next()
}

export const config = {
	matcher: [
		'/((?!login(?:/|$)|api/login(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)'
	]
}
