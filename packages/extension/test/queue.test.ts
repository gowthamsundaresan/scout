import { beforeEach, describe, expect, it, vi } from 'vitest'

import { postIngest } from '../src/ingest'
import { enqueueIngest, flushIngestQueue } from '../src/queue'

vi.mock('../src/ingest', () => ({ postIngest: vi.fn() }))
vi.mock('../src/config', () => ({
	getSettings: vi.fn().mockResolvedValue({ apiBase: 'http://api', token: 'tok', grokEnabled: true })
}))

// --- Types & state ---

const store: Record<string, unknown> = {}

globalThis.chrome = {
	storage: {
		local: {
			get: async (key: string) => ({ [key]: store[key] }),
			set: async (patch: Record<string, unknown>) => {
				Object.assign(store, patch)
			}
		}
	}
} as never

beforeEach(() => {
	delete store.ingestQueue
	vi.mocked(postIngest).mockReset()
})

// --- Tests ---

describe('ingest queue', () => {
	it('keeps a failed post queued and delivers it on a later flush', async () => {
		vi.mocked(postIngest).mockResolvedValue({ ok: false, status: 500 })
		await enqueueIngest('grok', { text: 'answer' })
		await flushIngestQueue()
		expect((store.ingestQueue as unknown[]).length).toBe(1)

		vi.mocked(postIngest).mockResolvedValue({ ok: true, status: 200 })
		await flushIngestQueue()
		expect((store.ingestQueue as unknown[]).length).toBe(0)
		expect(postIngest).toHaveBeenLastCalledWith('http://api', 'tok', 'grok', { text: 'answer' })
	})

	it('drains multiple items in order on a successful flush', async () => {
		vi.mocked(postIngest).mockResolvedValue({ ok: false, status: 500 })
		await enqueueIngest('grok', { text: 'a' })
		await enqueueIngest('grok', { text: 'b' })
		await flushIngestQueue() // settle the enqueue-triggered flush before flipping the mock

		vi.mocked(postIngest).mockClear()
		vi.mocked(postIngest).mockResolvedValue({ ok: true, status: 200 })
		await flushIngestQueue()

		const payloads = vi.mocked(postIngest).mock.calls.map((c) => (c[3] as { text: string }).text)
		expect(payloads).toEqual(['a', 'b'])
		expect((store.ingestQueue as unknown[]).length).toBe(0)
	})
})
