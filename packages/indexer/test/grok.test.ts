import { describe, expect, it } from 'vitest'

import { grok, grokPayloadSchema } from '../src/sources/grok'

describe('grok source', () => {
	it('maps a payload to a RawItem', () => {
		const item = grok.toRawItem!({
			text: 'hello',
			sourceRef: 'grok://x',
			capturedAt: '2026-06-28T00:00:00Z'
		})
		expect(item.source).toBe('grok')
		expect(item.text).toBe('hello')
		expect(item.sourceRef).toBe('grok://x')
	})

	it('defaults sourceRef from capturedAt', () => {
		expect(grok.toRawItem!({ text: 'hi', capturedAt: 'ts1' }).sourceRef).toBe('grok://ts1')
	})

	it('rejects payloads missing text', () => {
		expect(grokPayloadSchema.safeParse({ capturedAt: 'ts' }).success).toBe(false)
		expect(() => grok.toRawItem!({ capturedAt: 'ts' })).toThrow()
	})
})
