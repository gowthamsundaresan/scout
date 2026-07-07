import { getSettings } from './config'
import { postIngest } from './ingest'

// --- Types & state ---

export type QueuedIngest = { source: string; payload: unknown; queuedAt: number }

const KEY = 'ingestQueue'
const MAX_QUEUE = 100

// MV3 workers die between events, so the outbox lives in storage; the in-flight promise only
// coalesces concurrent flushes within one worker lifetime.
let inFlight: Promise<void> | null = null

// --- Core functions ---

export async function enqueueIngest(source: string, payload: unknown): Promise<void> {
	const queue = await read()
	queue.push({ source, payload, queuedAt: Date.now() })
	await write(queue.slice(-MAX_QUEUE))
	void flushIngestQueue()
}

export function flushIngestQueue(): Promise<void> {
	inFlight ??= flush().finally(() => {
		inFlight = null
	})
	return inFlight
}

// --- Helper functions ---

async function flush(): Promise<void> {
	const { apiBase, token } = await getSettings()
	if (!apiBase || !token) return
	const queue = await read()
	if (queue.length === 0) return

	const sent = new Set<string>()
	for (const item of queue) {
		const res = await postIngest(apiBase, token, item.source, item.payload)
		if (res.ok) sent.add(JSON.stringify(item))
	}
	// Re-read before writing: items enqueued mid-flush must survive the rewrite.
	const current = await read()
	await write(current.filter((item) => !sent.has(JSON.stringify(item))))
}

async function read(): Promise<QueuedIngest[]> {
	const { [KEY]: queue } = await chrome.storage.local.get(KEY)
	return queue ?? []
}

async function write(queue: QueuedIngest[]): Promise<void> {
	await chrome.storage.local.set({ [KEY]: queue })
}
