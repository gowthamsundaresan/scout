import { describe, expect, it } from 'vitest'

import type { MemoryRecord } from '@scout/memory'

import { seedKey, seedKind, seedWorthy } from '../src/seeding/seedWorthy'

const thesis: MemoryRecord = {
	namespace: 'self',
	type: 'thesis',
	dedupeKey: 'fde',
	title: 't',
	body: 'b'
}
const profile: MemoryRecord = {
	namespace: 'self',
	type: 'profile',
	dedupeKey: 'me',
	title: 't',
	body: 'b'
}
const person: MemoryRecord = {
	namespace: 'world',
	type: 'person',
	dedupeKey: 'world/person/jane',
	title: 'Jane',
	summary: 's',
	tags: [],
	salience: 0.9,
	source: { name: 'exa', url: 'https://x', fetchedAt: 'now' },
	whyInteresting: 'w'
}
const oppHi: MemoryRecord = {
	namespace: 'world',
	type: 'opportunity',
	dedupeKey: 'world/opportunity/berlin',
	title: 'Berlin AI Summit',
	summary: 's',
	tags: [],
	salience: 0.8,
	source: { name: 'clipper', url: 'https://b', fetchedAt: 'now' },
	fit: 'f'
}
const oppLo: MemoryRecord = { ...oppHi, dedupeKey: 'world/opportunity/low', salience: 0.3 }

describe('seedWorthy', () => {
	it('seeds self thesis/ask/offer but not profile', () => {
		expect(seedWorthy(thesis, 0.6)).toBe(true)
		expect(seedWorthy(profile, 0.6)).toBe(false)
	})

	it('seeds salient non-person world records, never people', () => {
		expect(seedWorthy(oppHi, 0.6)).toBe(true)
		expect(seedWorthy(oppLo, 0.6)).toBe(false)
		expect(seedWorthy(person, 0.6)).toBe(false)
	})

	it('keys self records under a prefix and world records by dedupeKey', () => {
		expect(seedKey(thesis)).toBe('self:fde')
		expect(seedKey(oppHi)).toBe('world/opportunity/berlin')
		expect(seedKind(oppHi)).toBe('opportunity')
	})
})
