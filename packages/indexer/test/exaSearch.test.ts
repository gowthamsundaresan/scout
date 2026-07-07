import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { connect, disconnect } from '../src/db/client'
import { IngestJob } from '../src/db/models/ingestJob'
import { SearchSeed } from '../src/db/models/searchSeed'
import { getExa } from '../src/sources/exaClient'
import { exaSearch } from '../src/sources/exaSearch'

vi.mock('../src/sources/exaClient', () => ({ getExa: vi.fn() }))
vi.mock('../src/seeding/reconcile', () => ({ reconcile: vi.fn().mockResolvedValue(0) }))

// --- Helper functions ---

function result(url: string, title = 'Jane Doe') {
	return { url, title, text: `${title} — engineer in Berlin`, publishedDate: null, author: null }
}

function makeFakeExa(results: ReturnType<typeof result>[]) {
	return { searchAndContents: vi.fn().mockResolvedValue({ results }) }
}

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
	await IngestJob.deleteMany({})
	vi.mocked(getExa).mockReset()
})

// --- Tests ---

describe('exaSearch adapter', () => {
	it('runs a due seed and returns raw items with seed state updated', async () => {
		await SearchSeed.create({ kind: 'offer', key: 'k1', query: 'ai people berlin' })
		const fake = makeFakeExa([result('https://in/jane'), result('https://in/bob', 'Bob')])
		vi.mocked(getExa).mockReturnValue(fake as never)

		const { items } = await exaSearch.fetch!(undefined)

		expect(items.map((i) => i.sourceRef)).toEqual(['https://in/jane', 'https://in/bob'])
		expect(items[0]).toMatchObject({ source: 'exa', title: 'Jane Doe' })
		const seed = await SearchSeed.findOne({ key: 'k1' })
		expect(seed?.totalSeen).toBe(2)
		expect(seed?.exhausted).toBe(true)
		expect(seed?.lastSearchAt).toBeTruthy()
		expect(seed?.dormant).toBe(false)
	})

	it('drops urls already ingested for the exa source', async () => {
		await SearchSeed.create({ kind: 'ask', key: 'k2', query: 'crypto founders' })
		await IngestJob.create({
			source: 'exa',
			status: 'done',
			item: { source: 'exa', sourceRef: 'https://in/jane', capturedAt: 'x' }
		})
		const fake = makeFakeExa([result('https://in/jane'), result('https://in/new', 'New')])
		vi.mocked(getExa).mockReturnValue(fake as never)

		const { items } = await exaSearch.fetch!(undefined)

		expect(items.map((i) => i.sourceRef)).toEqual(['https://in/new'])
		const seed = await SearchSeed.findOne({ key: 'k2' })
		expect(seed?.totalSeen).toBe(1)
	})

	it('skips seeds inside their cooldown window', async () => {
		await SearchSeed.create({
			kind: 'thesis',
			key: 'k3',
			query: 'agentic infra',
			lastSearchAt: new Date(),
			exhausted: true
		})
		const fake = makeFakeExa([result('https://in/jane')])
		vi.mocked(getExa).mockReturnValue(fake as never)

		const { items } = await exaSearch.fetch!(undefined)

		expect(items).toEqual([])
		expect(fake.searchAndContents).not.toHaveBeenCalled()
	})
})
