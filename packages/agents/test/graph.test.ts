import { describe, expect, it } from 'vitest'

import type { AiUpdateRecord, PersonRecord, Source, WorldRecord } from '@scout/memory'

import { parseCompose, parseRank, selectRecords } from '../src/ceo/graph'

const source: Source = { name: 'exa', url: 'https://x.com', fetchedAt: '2026-07-06T00:00:00Z' }

const person = (slug: string): PersonRecord => ({
	namespace: 'world',
	type: 'person',
	dedupeKey: `world/person/${slug}`,
	title: slug,
	summary: 'builds things',
	tags: ['ai'],
	salience: 0.8,
	source,
	whyInteresting: 'ships fast'
})

const update = (slug: string): AiUpdateRecord => ({
	namespace: 'world',
	type: 'ai-update',
	dedupeKey: `world/ai-update/${slug}`,
	title: slug,
	summary: 'a release',
	tags: ['llm'],
	salience: 0.7,
	source,
	whatHappened: 'launched',
	whyItMatters: 'big'
})

const world: WorldRecord[] = [person('jane'), person('bob'), update('gpt6')]

describe('parseRank', () => {
	it('keeps only dedupeKeys present in the pool', () => {
		const content = JSON.stringify({
			recommend: [
				{ dedupeKey: 'world/person/jane', reason: 'fit' },
				{ dedupeKey: 'world/person/ghost', reason: 'hallucinated' }
			],
			antiRecommend: [{ dedupeKey: 'world/person/bob', reason: 'noise' }],
			updates: [{ dedupeKey: 'world/ai-update/gpt6', reason: 'relevant' }]
		})
		const ranking = parseRank(content, world)
		expect(ranking.recommend.map((r) => r.dedupeKey)).toEqual(['world/person/jane'])
		expect(ranking.antiRecommend).toHaveLength(1)
		expect(ranking.updates).toHaveLength(1)
	})

	it('returns empty ranking on malformed or out-of-shape json', () => {
		expect(parseRank('not json', world).recommend).toHaveLength(0)
		expect(parseRank(JSON.stringify({ recommend: 'nope' }), world).recommend).toHaveLength(0)
	})
})

describe('selectRecords', () => {
	it('joins keys to records and keeps people vs updates honest', () => {
		const ranking = {
			recommend: [{ dedupeKey: 'world/person/jane', reason: 'x' }],
			antiRecommend: [{ dedupeKey: 'world/person/bob', reason: 'y' }],
			// an update key mistakenly ranked as a person-list would be filtered by the type guard
			updates: [
				{ dedupeKey: 'world/ai-update/gpt6', reason: 'z' },
				{ dedupeKey: 'world/person/jane', reason: 'wrong bucket' }
			]
		}
		const selected = selectRecords(ranking, world)
		expect(selected.recommend.map((p) => p.title)).toEqual(['jane'])
		expect(selected.antiRecommend.map((p) => p.title)).toEqual(['bob'])
		expect(selected.updates.map((u) => u.title)).toEqual(['gpt6'])
	})
})

describe('parseCompose', () => {
	it('returns an empty compose on bad json', () => {
		const out = parseCompose('garbage')
		expect(out.recommend.people).toHaveLength(0)
		expect(out.antiRecommend.people).toHaveLength(0)
	})

	it('parses a valid compose object', () => {
		const content = JSON.stringify({
			recommend: { headline: 'hi', people: [{ name: 'Jane', why: 'w', message: 'm' }] },
			updates: [{ title: 'GPT-6', why: 'big' }],
			antiRecommend: { people: [{ name: 'Bob', why: 'noise' }] }
		})
		const out = parseCompose(content)
		expect(out.recommend.people[0].name).toBe('Jane')
		expect(out.updates).toHaveLength(1)
	})
})
