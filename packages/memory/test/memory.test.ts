import { describe, expect, it } from 'vitest'

import { rehydrate, render } from '../src/render'
import { memoryRecordSchema } from '../src/schema'
import type { DecisionRecord, MemoryRecord, SelfRecord, WorldRecord } from '../src/types'

const selfRecord: SelfRecord = {
	namespace: 'self',
	type: 'thesis',
	dedupeKey: 'self/thesis/fde-as-a-service',
	title: 'FDE-as-a-service',
	body: 'Forward-deployed engineering, productized.',
	tags: ['pitch', 'fde']
}

const worldRecord: WorldRecord = {
	namespace: 'world',
	type: 'person',
	dedupeKey: 'world/person/jane-doe',
	title: 'Jane Doe',
	summary: 'Builds AI infra.',
	tags: ['ai', 'infra'],
	salience: 0.8,
	source: { name: 'exa', url: 'https://example.com/jane', fetchedAt: '2026-06-23T00:00:00Z' },
	role: 'Founder',
	whyInteresting: 'Shipping an inference engine.'
}

const decisionRecord: DecisionRecord = {
	namespace: 'system',
	type: 'decision',
	dedupeKey: 'decision:world/person/bela-wiertz',
	title: 'Bela Wiertz — surfaced',
	body: 'Community operator at Tech:Europe; strong Berlin intro target.',
	targetKey: 'world/person/bela-wiertz',
	targetType: 'person',
	intent: 0,
	verdict: 'surfaced',
	decidedAt: '2026-06-24T00:00:00Z'
}

describe('schema gate', () => {
	it('accepts a structured record', () => {
		expect(memoryRecordSchema.safeParse(selfRecord).success).toBe(true)
		expect(memoryRecordSchema.safeParse(worldRecord).success).toBe(true)
	})

	it('rejects a raw dump', () => {
		expect(memoryRecordSchema.safeParse('just some scraped text').success).toBe(false)
		expect(
			memoryRecordSchema.safeParse({ namespace: 'self', body: 'no type or title' }).success
		).toBe(false)
		expect(memoryRecordSchema.safeParse({ ...worldRecord, salience: 5 }).success).toBe(false)
	})
})

describe('render', () => {
	it('derives containerTag, sanitized customId, content, metadata', () => {
		const d = render(selfRecord)
		expect(d.containerTag).toBe('self')
		expect(d.customId).toBe('self-thesis-fde-as-a-service')
		expect(d.customId).toMatch(/^[A-Za-z0-9_-]{1,100}$/)
		expect(d.content).toContain('FDE-as-a-service')
		expect(d.metadata.type).toBe('thesis')
		expect(d.metadata.tags).toBeUndefined()
	})

	it('puts salience in metadata for world records', () => {
		expect(render(worldRecord).metadata.salience).toBe(0.8)
	})
})

describe('rehydrate', () => {
	it('round-trips a record through metadata.record', () => {
		const records: MemoryRecord[] = [selfRecord, worldRecord]
		for (const record of records) {
			expect(rehydrate(render(record).metadata)).toEqual(record)
		}
	})

	it('returns null for missing or malformed metadata', () => {
		expect(rehydrate(undefined)).toBeNull()
		expect(rehydrate({})).toBeNull()
		expect(rehydrate({ record: 'not json' })).toBeNull()
	})
})

describe('decision record', () => {
	it('accepts a valid decision', () => {
		expect(memoryRecordSchema.safeParse(decisionRecord).success).toBe(true)
	})

	it('rejects a bad verdict and a bad intent', () => {
		expect(memoryRecordSchema.safeParse({ ...decisionRecord, verdict: 'maybe' }).success).toBe(
			false
		)
		expect(memoryRecordSchema.safeParse({ ...decisionRecord, intent: 2 }).success).toBe(false)
	})

	it('renders customId from dedupeKey + scalar decision metadata', () => {
		const d = render(decisionRecord)
		expect(d.customId).toBe('decision-world-person-bela-wiertz')
		expect(d.metadata.type).toBe('decision')
		expect(d.metadata.verdict).toBe('surfaced')
		expect(d.metadata.intent).toBe(0)
		expect(d.metadata.targetKey).toBe('world/person/bela-wiertz')
	})

	it('round-trips through metadata.record', () => {
		expect(rehydrate(render(decisionRecord).metadata)).toEqual(decisionRecord)
	})
})
