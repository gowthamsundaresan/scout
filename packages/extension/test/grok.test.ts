import { describe, expect, it } from 'vitest'

import { parseGrokNDJSONStream } from '../src/grok/driver'

describe('parseGrokNDJSONStream', () => {
	it('accumulates response tokens and the conversation id', () => {
		const stream = [
			JSON.stringify({ result: { conversation: { conversationId: 'c1' } } }),
			JSON.stringify({ result: { response: { token: 'Hello ' } } }),
			JSON.stringify({ result: { response: { token: 'world' } } }),
			'malformed line',
			''
		].join('\n')
		const out = parseGrokNDJSONStream(stream)
		expect(out.answer).toBe('Hello world')
		expect(out.conversationId).toBe('c1')
	})

	it('returns a null answer when there are no tokens', () => {
		expect(parseGrokNDJSONStream('').answer).toBeNull()
	})
})
