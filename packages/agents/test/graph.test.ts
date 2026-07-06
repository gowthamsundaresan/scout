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

const world: WorldRecord[] = [person('jane'), person('bob'), update('gpt6'), update('hype')]

describe('parseRank', () => {
	it('keeps only dedupeKeys present in the pool, across all four buckets', () => {
		const content = JSON.stringify({
			people: {
				recommend: [
					{ dedupeKey: 'world/person/jane', reason: 'fit' },
					{ dedupeKey: 'world/person/ghost', reason: 'hallucinated' }
				],
				antiRecommend: [{ dedupeKey: 'world/person/bob', reason: 'noise' }]
			},
			updates: {
				recommend: [{ dedupeKey: 'world/ai-update/gpt6', reason: 'material' }],
				antiRecommend: [{ dedupeKey: 'world/ai-update/hype', reason: 'overhyped' }]
			}
		})
		const ranking = parseRank(content, world)
		expect(ranking.people.recommend.map((r) => r.dedupeKey)).toEqual(['world/person/jane'])
		expect(ranking.people.antiRecommend).toHaveLength(1)
		expect(ranking.updates.recommend).toHaveLength(1)
		expect(ranking.updates.antiRecommend[0].dedupeKey).toBe('world/ai-update/hype')
	})

	it('returns empty ranking on malformed or out-of-shape json', () => {
		expect(parseRank('not json', world).people.recommend).toHaveLength(0)
		expect(parseRank(JSON.stringify({ people: 'nope' }), world).updates.recommend).toHaveLength(0)
	})
})

describe('selectRecords', () => {
	it('joins keys to records and keeps people vs updates honest', () => {
		const ranking = {
			people: {
				recommend: [{ dedupeKey: 'world/person/jane', reason: 'x' }],
				// an update key mistakenly placed in a people bucket is dropped by the type guard
				antiRecommend: [
					{ dedupeKey: 'world/person/bob', reason: 'y' },
					{ dedupeKey: 'world/ai-update/gpt6', reason: 'wrong bucket' }
				]
			},
			updates: {
				recommend: [{ dedupeKey: 'world/ai-update/gpt6', reason: 'z' }],
				antiRecommend: [{ dedupeKey: 'world/ai-update/hype', reason: 'noise' }]
			}
		}
		const selected = selectRecords(ranking, world)
		expect(selected.peopleRecommend.map((p) => p.title)).toEqual(['jane'])
		expect(selected.peopleAntiRecommend.map((p) => p.title)).toEqual(['bob'])
		expect(selected.updatesRecommend.map((u) => u.title)).toEqual(['gpt6'])
		expect(selected.updatesAntiRecommend.map((u) => u.title)).toEqual(['hype'])
	})
})

describe('parseCompose', () => {
	it('returns an empty compose on bad json', () => {
		const out = parseCompose('garbage')
		expect(out.people.recommend.entries).toHaveLength(0)
		expect(out.updates.antiRecommend.entries).toHaveLength(0)
	})

	it('parses a valid compose object', () => {
		const content = JSON.stringify({
			people: {
				recommend: { headline: 'hi', entries: [{ name: 'Jane', why: 'w', message: 'm' }] },
				antiRecommend: { entries: [{ name: 'Bob', why: 'noise' }] }
			},
			updates: {
				recommend: { headline: 'ship', entries: [{ title: 'GPT-6', why: 'big' }] },
				antiRecommend: { entries: [{ title: 'Hype', why: 'skip' }] }
			}
		})
		const out = parseCompose(content)
		expect(out.people.recommend.entries[0].name).toBe('Jane')
		expect(out.updates.recommend.entries).toHaveLength(1)
	})
})
