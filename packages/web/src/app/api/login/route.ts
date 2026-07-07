import { NextResponse } from 'next/server'

import { SESSION_COOKIE, createToken, timingSafeEqual } from '../../../lib/auth'
import { env } from '../../../lib/env'

export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as { password?: unknown }
	if (typeof body.password !== 'string' || !timingSafeEqual(body.password, env.dashPassword())) {
		return NextResponse.json({ error: 'invalid password' }, { status: 401 })
	}

	const res = NextResponse.json({ ok: true })
	res.cookies.set(SESSION_COOKIE, await createToken(env.cookieSecret()), {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30,
		path: '/'
	})
	return res
}
