import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { connect, disconnect } from '../src/db/client'
import { SearchSeed } from '../src/db/models/searchSeed'
import { exa } from '../src/sources/exa'
import { getExa } from '../src/sources/exaClient'

vi.mock('../src/sources/exaClient', () => ({ getExa: vi.fn() }))
vi.mock('../src/seeding/reconcile', () => ({ reconcile: vi.fn().mockResolvedValue(0) }))

// --- Helper functions ---

function personItem(name: string, url: string) {
	return {
		id: `it-${name}`,
		source: 'search',
		sourceId: 'srch1',
		websetId: 'ws1',
		properties: {
			type: 'person',
			url,
			description: 'relevant',
			person: {
				name,
				position: 'Engineer',
				company: { name: 'Acme', location: 'Berlin' },
				location: 'Berlin',
				pictureUrl: null
			}
		}
	}
}

function companyItem() {
	return {
		id: 'c1',
		source: 'search',
		sourceId: 'srch1',
		websetId: 'ws1',
		properties: { type: 'company', url: 'https://acme.com', company: { name: 'Acme' } }
	}
}

function makeFakeExa() {
	return {
		websets: {
			create: vi.fn().mockResolvedValue({ id: 'ws1', searches: [{ id: 'srch1' }] }),
			searches: {
				create: vi.fn().mockResolvedValue({ id: 'srch2' }),
				get: vi.fn().mockResolvedValue({ id: 'srch1', status: 'completed' })
			},
			items: {
				list: vi.fn().mockResolvedValue({
					data: [
						personItem('Jane', 'https://in/jane'),
						personItem('Bob', 'https://in/bob'),
						companyItem()
					],
					hasMore: false,
					nextCursor: null
				})
			}
		}
	}
}

function runFetch() {
	if (!exa.fetch) throw new Error('exa.fetch missing')
	return exa.fetch(undefined)
}

let mongo: MongoMemoryServer
let fakeExa: ReturnType<typeof makeFakeExa>

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
	fakeExa = makeFakeExa()
	vi.mocked(getExa).mockReturnValue(fakeExa as unknown as ReturnType<typeof getExa>)
})

describe('exa adapter', () => {
	it('runs a due location seed: creates the webset, maps only people, advances state', async () => {
		await SearchSeed.create({ kind: 'location', key: 'location:berlin', query: 'people in berlin' })

		const { items } = await runFetch()

		expect(items).toHaveLength(2)
		expect(items[0]).toMatchObject({ source: 'exa', sourceRef: 'https://in/jane', title: 'Jane' })
		expect(items[0].text).toContain('Name: Jane')
		expect(items[0].text).toContain('Company: Acme')
		expect(fakeExa.websets.create).toHaveBeenCalledTimes(1)
		expect(fakeExa.websets.items.list).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ sourceId: 'srch1' })
		)

		const seed = await SearchSeed.findOne({ key: 'location:berlin' })
		expect(seed?.websetId).toBe('ws1')
		expect(seed?.lastSearchAt).toBeTruthy()
		expect(seed?.inFlightSearchId).toBeFalsy()
		expect(seed?.exhausted).toBe(true) // 2 < target count
		expect(seed?.dormant).toBe(false) // locations recur
	})

	it('waits for a search to leave pending/created before reading items', async () => {
		fakeExa.websets.searches.get
			.mockResolvedValueOnce({ id: 'srch1', status: 'pending' })
			.mockResolvedValueOnce({ id: 'srch1', status: 'completed' })
		await SearchSeed.create({ kind: 'location', key: 'location:berlin', query: 'q' })

		const { items } = await runFetch()

		expect(fakeExa.websets.searches.get.mock.calls.length).toBeGreaterThanOrEqual(2)
		expect(items).toHaveLength(2)
	})

	it('does not dorm a dynamic seed when its search is canceled', async () => {
		fakeExa.websets.searches.get.mockResolvedValue({ id: 'srch1', status: 'canceled' })
		await SearchSeed.create({ kind: 'opportunity', key: 'world/opportunity/x', query: 'q' })

		const { items } = await runFetch()

		expect(items).toHaveLength(0)
		const seed = await SearchSeed.findOne({ key: 'world/opportunity/x' })
		expect(seed?.dormant).toBe(false)
		expect(seed?.inFlightSearchId).toBeFalsy()
	})

	it('keeps a dynamic seed active on an under-full but non-empty result', async () => {
		await SearchSeed.create({ kind: 'opportunity', key: 'world/opportunity/y', query: 'q' })

		const { items } = await runFetch()

		expect(items).toHaveLength(2) // 2 people < target 25
		const seed = await SearchSeed.findOne({ key: 'world/opportunity/y' })
		expect(seed?.exhausted).toBe(true)
		expect(seed?.dormant).toBe(false) // only dorm on zero new people
	})

	it('skips a seed still within its gap (no Exa call)', async () => {
		await SearchSeed.create({
			kind: 'location',
			key: 'location:berlin',
			query: 'q',
			websetId: 'ws1',
			lastSearchAt: new Date(),
			exhausted: false
		})

		const { items } = await runFetch()

		expect(items).toHaveLength(0)
		expect(fakeExa.websets.searches.create).not.toHaveBeenCalled()
	})

	it('defers dynamic seeds once the daily budget is spent', async () => {
		const today = new Date()
		for (let i = 0; i < 10; i++) {
			await SearchSeed.create({
				kind: 'opportunity',
				key: `world/opportunity/spent-${i}`,
				query: 'q',
				websetId: `ws-${i}`,
				lastSearchAt: today,
				exhausted: false
			})
		}
		await SearchSeed.create({ kind: 'opportunity', key: 'world/opportunity/new', query: 'q' })

		const { items } = await runFetch()

		expect(items).toHaveLength(0)
		expect(fakeExa.websets.create).not.toHaveBeenCalled()
	})
})
