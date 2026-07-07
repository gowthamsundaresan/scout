import { createHmac, timingSafeEqual } from 'node:crypto'

// Mirrors the gateway's forward signing: hex HMAC-SHA256 of the raw body, compared constant-time.
export function verifySignature(
	raw: string,
	signature: string | undefined,
	secret: string
): boolean {
	if (!signature) return false
	const expected = createHmac('sha256', secret).update(raw).digest('hex')
	const a = Buffer.from(expected)
	const b = Buffer.from(signature)
	if (a.length !== b.length) return false
	return timingSafeEqual(a, b)
}
