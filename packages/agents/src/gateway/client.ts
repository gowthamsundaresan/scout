import type { Intent } from '@scout/memory'

// --- Types & state ---

export type AdminAuth = { baseUrl: string; adminSecret: string }
export type SendAuth = { baseUrl: string; jwt: string }

export type Scope = { send?: boolean; receive?: boolean }

export type RegisterBody = { clientId?: string; name: string; scope: Scope; receiveUrl?: string }
export type TemplateBody = {
	templateId?: string
	name: string
	channel: 'email' | 'tg'
	title: string
	body: string
}
export type SendBody = {
	messageId?: string
	templateId: string
	intent: Intent
	vars?: Record<string, string>
	receiverIds?: string[]
}

export type Registration = { clientId: string; jwt: string; scope: Scope }
export type SendResult = { messageId: string; status: string }

// --- Core functions ---

export function registerClient(admin: AdminAuth, body: RegisterBody): Promise<Registration> {
	return post(admin.baseUrl, '/register', { 'X-API-Key': admin.adminSecret }, body)
}

export function upsertTemplate(
	admin: AdminAuth,
	body: TemplateBody
): Promise<{ templateId: string }> {
	return post(admin.baseUrl, '/templates', { 'X-API-Key': admin.adminSecret }, body)
}

export function sendMessage(auth: SendAuth, body: SendBody): Promise<SendResult> {
	return post(auth.baseUrl, '/send', { Authorization: `Bearer ${auth.jwt}` }, body)
}

// --- Helper functions ---

async function post<T>(
	baseUrl: string,
	path: string,
	headers: Record<string, string>,
	body: unknown
): Promise<T> {
	const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	})
	if (!res.ok) {
		throw new Error(`gateway ${path} ${res.status}: ${await res.text()}`)
	}
	return (await res.json()) as T
}
