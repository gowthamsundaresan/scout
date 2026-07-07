import { env } from './env'
import type { DecisionRecord, IngestJob, LessonRecord, MemoryRecord, SearchSeed } from './types'

// --- Core functions ---

export function opsJobs(params: {
	status?: string
	source?: string
}): Promise<{ counts: Record<string, number>; jobs: IngestJob[] }> {
	return get('/ops/jobs', params)
}

export function opsSeeds(): Promise<{ seeds: SearchSeed[] }> {
	return get('/ops/seeds', {})
}

export function opsDecisions(q?: string): Promise<{ decisions: DecisionRecord[] }> {
	return get('/ops/decisions', { q })
}

export function opsLessons(q?: string): Promise<{ lessons: LessonRecord[] }> {
	return get('/ops/lessons', { q })
}

export function memoryBrowse(
	namespace: string,
	q?: string,
	type?: string,
	limit?: number
): Promise<{ records: MemoryRecord[] }> {
	return get('/ops/memory', { namespace, q, type, limit: limit ? String(limit) : undefined })
}

// --- Helper functions ---

// Bounded: a wedged supermemory must degrade to an "unreachable" chip, not hang the page
const TIMEOUT_MS = 10_000

async function get<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
	const qs = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value) qs.set(key, value)
	}
	const suffix = qs.size ? `?${qs}` : ''
	const res = await fetch(`${env.scoutApiUrl().replace(/\/$/, '')}${path}${suffix}`, {
		headers: { Authorization: `Bearer ${env.scoutApiToken()}` },
		cache: 'no-store',
		signal: AbortSignal.timeout(TIMEOUT_MS)
	})
	if (!res.ok) throw new Error(`scout api ${path} ${res.status}: ${await res.text()}`)
	return res.json()
}
