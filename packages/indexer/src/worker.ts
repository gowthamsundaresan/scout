import 'dotenv/config'
import { pathToFileURL } from 'node:url'

import { connect } from './db/client'
import { claimNext, markDone, markFailed } from './jobs/queue'
import { startScheduler } from './jobs/scheduler'
import { processItem } from './pipeline/process'
import { seedLocations } from './seeding/locations'
import { flushTraces } from './trace'

// --- Types & state ---

const POLL_MS = 2000

// --- Core functions ---

export async function processOnce(): Promise<boolean> {
	const job = await claimNext()
	if (!job) return false
	try {
		const written = await processItem(job.item)
		await markDone(job.id, written)
		console.log(`[indexer] job ${job.id} done (${written.length} records)`)
	} catch (err) {
		await markFailed(job.id, (err as Error).message, job.attempts)
		console.error(`[indexer] job ${job.id} failed: ${(err as Error).message}`)
	} finally {
		await flushTraces()
	}
	return true
}

export async function startWorker(): Promise<void> {
	for (;;) {
		const processed = await processOnce()
		if (!processed) await sleep(POLL_MS)
	}
}

// --- Helper functions ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
	const uri = process.env.MONGO_URI
	if (!uri) throw new Error('MONGO_URI is required')
	// Fail fast on missing keys rather than silently retrying empty pulls every interval.
	for (const key of ['EXA_API_KEY', 'OPENROUTER_API_KEY'] as const) {
		if (!process.env[key]) throw new Error(`${key} is required`)
	}
	await connect(uri)
	await seedLocations()
	console.log('[indexer] worker started')
	void startScheduler()
	await startWorker()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error('[indexer] fatal:', err)
		process.exit(1)
	})
}
