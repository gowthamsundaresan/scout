import { env } from './env'
import type { GatewayMessage, Thread } from './types'

// --- Types & state ---

export type ListParams = {
	direction?: 'out' | 'in'
	templateId?: string
	fromClientId?: string
	before?: string
	limit?: number
}

// --- Core functions ---

export function listMessages(
	params: ListParams = {}
): Promise<{ messages: GatewayMessage[]; nextCursor: string | null }> {
	const qs = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) qs.set(key, String(value))
	}
	return get(`/messages?${qs}`)
}

export function getThread(messageId: string): Promise<Thread> {
	return get(`/messages/${encodeURIComponent(messageId)}/thread`)
}

// Mirrors tg-ingress: the eval loop reads only replyToMessageId + payload.text, so a web reply
// walks the same /receive → forward → evalReplyWorkflow chain a Telegram reply does.
export async function postReply(
	replyToMessageId: string,
	text: string
): Promise<{ messageId: string; forwardedTo: string[] }> {
	const res = await fetch(`${base()}/receive`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.gatewayJwt()}`
		},
		body: JSON.stringify({
			messageId: `web-${crypto.randomUUID()}`,
			replyToMessageId,
			payload: { text }
		})
	})
	if (!res.ok) throw new Error(`gateway /receive ${res.status}: ${await res.text()}`)
	return res.json()
}

// --- Helper functions ---

function base(): string {
	return env.gatewayUrl().replace(/\/$/, '')
}

async function get<T>(path: string): Promise<T> {
	const res = await fetch(`${base()}${path}`, {
		headers: { Authorization: `Bearer ${env.gatewayJwt()}` },
		cache: 'no-store'
	})
	if (!res.ok) throw new Error(`gateway ${path} ${res.status}: ${await res.text()}`)
	return res.json()
}
