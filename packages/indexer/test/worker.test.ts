import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { connect, disconnect } from '../src/db/client'
import { IngestJob } from '../src/db/models/ingestJob'
import { enqueueClip } from '../src/enqueue'
import { processOnce } from '../src/worker'

vi.mock('@scout/memory', () => ({ write: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/processing/agent', () => ({
	structure: vi.fn().mockResolvedValue([
		{
			namespace: 'world',
			type: 'person',
			dedupeKey: 'world/person/jane',
			title: 'Jane',
			summary: 's',
			tags: [],
			salience: 0.7,
			source: { name: 'clipper', url: 'https://x.com', fetchedAt: 'now' },
			whyInteresting: 'w'
		}
	])
}))

let mongo: MongoMemoryServer

beforeAll(async () => {
	mongo = await MongoMemoryServer.create()
	await connect(mongo.getUri())
})

afterAll(async () => {
	await disconnect()
	await mongo.stop()
})

describe('processOnce', () => {
	it('claims a queued job, processes it, marks done with written[]', async () => {
		const id = await enqueueClip({
			url: 'https://x.com',
			selection: 'A clipped note about Jane who builds AI infra.',
			capturedAt: 'now'
		})
		const processed = await processOnce()
		expect(processed).toBe(true)
		const job = await IngestJob.findById(id)
		expect(job?.status).toBe('done')
		expect(job?.written).toContain('world/person/jane')
	})

	it('returns false when the queue is empty', async () => {
		expect(await processOnce()).toBe(false)
	})
})
