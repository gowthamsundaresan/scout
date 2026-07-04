import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryRecord } from '@scout/memory'
import { list } from '@scout/memory'

import { connect, disconnect } from '../src/db/client'
import { SearchSeed } from '../src/db/models/searchSeed'
import { reconcile } from '../src/seeding/reconcile'
import { exaQuery } from '../src/sources/exaQuery'

vi.mock('@scout/memory', () => ({ list: vi.fn() }))
vi.mock('../src/sources/exaQuery', () => ({ exaQuery: vi.fn().mockResolvedValue('find people') }))

const thesis: MemoryRecord = {
	namespace: 'self',
	type: 'thesis',
	dedupeKey: 'fde',
	title: 't',
	body: 'b'
}
const opp: MemoryRecord = {
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

const mockedList = vi.mocked(list)

let mongo: MongoMemoryServer

beforeAll(async () => {
	mongo = await MongoMemoryServer.create()
	await connect(mongo.getUri())
})

afterAll(async () => {
	await disconnect()
	await mongo.stop()
})

beforeEach(async () => {
	await SearchSeed.deleteMany({})
	vi.clearAllMocks()
	// Mirror the real server-side filtering: self → theses; world is queried per non-person type.
	mockedList.mockImplementation((namespace, opts) =>
		Promise.resolve(
			(namespace === 'self' ? [thesis] : opts?.type === 'opportunity' ? [opp, person] : []) as never
		)
	)
})

describe('reconcile', () => {
	it('creates one seed per worthy new record (skips the person)', async () => {
		const created = await reconcile()
		expect(created).toBe(2)
		const keys = (await SearchSeed.find().lean<{ key: string }[]>()).map((s) => s.key).sort()
		expect(keys).toEqual(['self:fde', 'world/opportunity/berlin'])
		expect(exaQuery).toHaveBeenCalledTimes(2)
	})

	it('does not re-seed records already turned into seeds', async () => {
		await reconcile()
		vi.mocked(exaQuery).mockClear()
		const created = await reconcile()
		expect(created).toBe(0)
		expect(await SearchSeed.countDocuments()).toBe(2)
		expect(exaQuery).not.toHaveBeenCalled()
	})

	it('tombstones a record whose query synth is empty, then never retries it', async () => {
		mockedList.mockImplementation((namespace) =>
			Promise.resolve((namespace === 'self' ? [thesis] : []) as never)
		)
		vi.mocked(exaQuery).mockResolvedValueOnce('')

		const created = await reconcile()
		expect(created).toBe(0)
		const seed = await SearchSeed.findOne({ key: 'self:fde' })
		expect(seed?.dormant).toBe(true)

		vi.mocked(exaQuery).mockClear()
		await reconcile()
		expect(exaQuery).not.toHaveBeenCalled()
	})
})
