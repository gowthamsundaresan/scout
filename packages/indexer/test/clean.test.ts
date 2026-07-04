import { describe, expect, it } from 'vitest'

import { clean } from '../src/pipeline/clean'

describe('clean', () => {
	it('extracts article text from html', () => {
		const body = 'Forward deployed engineering is the new sales motion for AI labs. '.repeat(15)
		const html = `<html><head><title>FDE</title></head><body><nav>home about</nav><article><h1>FDE</h1><p>${body}</p></article></body></html>`
		const out = clean({ html, url: 'https://example.com/post' })
		expect(out.text).toContain('Forward deployed engineering')
		expect(out.text.length).toBeGreaterThan(100)
	})

	it('passes selection text through, trimmed', () => {
		const out = clean({ text: '  hand-picked snippet  ', url: 'https://example.com' })
		expect(out.text).toBe('hand-picked snippet')
	})

	it('returns empty text when nothing usable', () => {
		expect(clean({ url: 'https://example.com' }).text).toBe('')
	})
})
