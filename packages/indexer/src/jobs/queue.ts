import { IngestJob } from '../db/models/ingestJob'
import type { JobStatus } from '../db/models/ingestJob'
import type { RawItem } from '../sources/types'

// --- Types & state ---

const MAX_ATTEMPTS = 3
const STUCK_MS = 5 * 60 * 1000

// --- Core functions ---

export async function enqueue(source: string, item: RawItem): Promise<string> {
	const job = await IngestJob.create({ source, item, status: 'queued' })
	return job.id
}

export function claimNext() {
	const stuckBefore = new Date(Date.now() - STUCK_MS)
	return IngestJob.findOneAndUpdate(
		{ $or: [{ status: 'queued' }, { status: 'processing', updatedAt: { $lt: stuckBefore } }] },
		{ $set: { status: 'processing' }, $inc: { attempts: 1 } },
		{ sort: { createdAt: 1 }, new: true }
	)
}

export async function markDone(id: string, written: string[]): Promise<void> {
	await IngestJob.findByIdAndUpdate(id, { status: 'done', written, error: undefined })
}

export async function markFailed(id: string, error: string, attempts: number): Promise<void> {
	const status: JobStatus = attempts >= MAX_ATTEMPTS ? 'failed' : 'queued'
	await IngestJob.findByIdAndUpdate(id, { status, error })
}
