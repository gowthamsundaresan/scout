import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifySignature } from '../src/receiver/verify'

const sign = (raw: string, secret: string) => createHmac('sha256', secret).update(raw).digest('hex')

describe('verifySignature', () => {
	it('accepts the gateway signature and rejects everything else', () => {
		const raw = JSON.stringify({ messageId: 'tg-1-2', replyToMessageId: 'run-abc-people-0' })
		expect(verifySignature(raw, sign(raw, 's3cret'), 's3cret')).toBe(true)
		expect(verifySignature(raw, sign(raw, 'wrong'), 's3cret')).toBe(false)
		expect(verifySignature(raw + ' ', sign(raw, 's3cret'), 's3cret')).toBe(false)
		expect(verifySignature(raw, undefined, 's3cret')).toBe(false)
		expect(verifySignature(raw, 'short', 's3cret')).toBe(false)
	})
})
