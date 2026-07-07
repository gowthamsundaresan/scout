import { NextResponse } from 'next/server'

import { postReply } from '../../../lib/gateway'

const MAX_TEXT = 4000

export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as {
		replyToMessageId?: unknown
		text?: unknown
	}
	if (
		typeof body.replyToMessageId !== 'string' ||
		typeof body.text !== 'string' ||
		!body.text.trim()
	) {
		return NextResponse.json({ error: 'replyToMessageId and text are required' }, { status: 400 })
	}

	try {
		const result = await postReply(body.replyToMessageId, body.text.trim().slice(0, MAX_TEXT))
		return NextResponse.json(result)
	} catch (err) {
		return NextResponse.json({ error: (err as Error).message }, { status: 502 })
	}
}
