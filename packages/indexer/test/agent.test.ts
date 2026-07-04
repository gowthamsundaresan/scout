import { describe, expect, it } from 'vitest'

import type { Source } from '@scout/memory'

import { parseRecords } from '../src/processing/agent'

const source: Source = {
	name: 'clipper',
	url: 'https://example.com',
	fetchedAt: '2026-06-28T00:00:00Z'
}

describe('parseRecords', () => {
	it('maps valid LLM JSON to WorldRecords', () => {
		const content = JSON.stringify({
			items: [
				{
					type: 'person',
					slug: 'jane-doe',
					title: 'Jane Doe',
					summary: 'Builds AI infra',
					tags: ['ai'],
					salience: 0.8,
					whyInteresting: 'ships inference engines'
				},
				{
					type: 'ai-update',
					slug: 'gpt6',
					title: 'GPT-6',
					summary: 'released',
					tags: ['llm'],
					salience: 0.6,
					whatHappened: 'launched',
					whyItMatters: 'big jump'
				}
			]
		})
		const records = parseRecords(content, source)
		expect(records).toHaveLength(2)
		expect(records[0].dedupeKey).toBe('world/person/jane-doe')
		expect(records[0].namespace).toBe('world')
		expect(records[0].source.url).toBe('https://example.com')
	})

	it('drops items missing required per-type fields', () => {
		const content = JSON.stringify({
			items: [{ type: 'person', slug: 'x', title: 't', summary: 's', tags: [], salience: 0.5 }]
		})
		expect(parseRecords(content, source)).toHaveLength(0)
	})

	it('returns [] on malformed or out-of-shape json', () => {
		expect(parseRecords('not json', source)).toHaveLength(0)
		expect(parseRecords(JSON.stringify({ items: 'nope' }), source)).toHaveLength(0)
		expect(
			parseRecords(JSON.stringify({ items: [{ type: 'person', salience: 5 }] }), source)
		).toHaveLength(0)
	})
})
