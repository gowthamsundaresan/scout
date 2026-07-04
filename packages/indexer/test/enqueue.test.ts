import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { connect, disconnect } from '../src/db/client'
import { IngestJob } from '../src/db/models/ingestJob'
import { enqueueClip } from '../src/enqueue'

let mongo: MongoMemoryServer

beforeAll(async () => {
	mongo = await MongoMemoryServer.create()
	await connect(mongo.getUri())
})

afterAll(async () => {
	await disconnect()
	await mongo.stop()
})

describe('enqueueClip', () => {
	it('inserts a queued clipper job from a clip payload', async () => {
		const id = await enqueueClip({
			url: 'https://example.com/p',
			html: '<html></html>',
			capturedAt: '2026-06-28T00:00:00Z'
		})
		const job = await IngestJob.findById(id)
		expect(job?.status).toBe('queued')
		expect(job?.source).toBe('clipper')
		expect(job?.item.sourceRef).toBe('https://example.com/p')
	})
})
