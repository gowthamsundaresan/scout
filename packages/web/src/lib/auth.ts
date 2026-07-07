// Web Crypto only (no node:crypto) so this also runs in the edge middleware runtime.

// --- Types & state ---

export const SESSION_COOKIE = 'scout_session'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const encoder = new TextEncoder()

// --- Core functions ---

export async function createToken(secret: string): Promise<string> {
	const exp = Date.now() + THIRTY_DAYS_MS
	return `${exp}.${await hmac(String(exp), secret)}`
}

export async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
	if (!token || !secret) return false
	const parts = token.split('.')
	if (parts.length !== 2) return false
	const [exp, sig] = parts
	if (!exp || !sig || Number(exp) < Date.now()) return false
	return timingSafeEqual(sig, await hmac(exp, secret))
}

// HMAC both sides so the comparison leaks neither content nor length
export async function safeCompare(a: string, b: string, secret: string): Promise<boolean> {
	return timingSafeEqual(await hmac(a, secret), await hmac(b, secret))
}

export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
	return diff === 0
}

// --- Helper functions ---

async function hmac(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))))
}

function base64url(bytes: Uint8Array): string {
	let raw = ''
	for (const b of bytes) raw += String.fromCharCode(b)
	return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
