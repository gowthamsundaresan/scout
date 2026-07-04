import { Checkpoint } from '../db/models/checkpoint'
import { listSources } from '../sources/registry'
import { enqueue } from './queue'

// --- Types & state ---

const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_HOURS ?? 6) * 60 * 60 * 1000

// --- Core functions ---

export async function pullOnce(): Promise<number> {
	let enqueued = 0
	for (const source of listSources()) {
		if (source.mode !== 'pull' || !source.fetch) continue
		const checkpoint = await Checkpoint.findOne({ source: source.name })
		const { items, cursor } = await source.fetch(checkpoint?.cursor)
		for (const item of items) {
			await enqueue(source.name, item)
			enqueued++
		}
		await Checkpoint.findOneAndUpdate({ source: source.name }, { cursor }, { upsert: true })
	}
	return enqueued
}

export async function startScheduler(): Promise<void> {
	for (;;) {
		try {
			const enqueued = await pullOnce()
			if (enqueued) console.log(`[indexer] scheduler enqueued ${enqueued} item(s)`)
		} catch (err) {
			console.error(`[indexer] scheduler error: ${(err as Error).message}`)
		}
		await sleep(INTERVAL_MS)
	}
}

// --- Helper functions ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
