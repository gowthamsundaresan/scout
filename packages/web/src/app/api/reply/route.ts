import { NextResponse } from 'next/server'

import { postReply } from '../../../lib/gateway'

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

	const result = await postReply(body.replyToMessageId, body.text.trim())
	return NextResponse.json(result)
}
