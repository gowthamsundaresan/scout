import { getClient } from './client'
import { rehydrate, render } from './render'
import { memoryRecordSchema } from './schema'
import type {
	DecisionRecord,
	MemoryRecord,
	Namespace,
	SelfRecord,
	SystemRecord,
	WorldRecord
} from './types'

// --- Types & state ---

export type QueryOptions = {
	q: string
	limit?: number
	threshold?: number
	type?: string
	rerank?: boolean
}

export type ListOptions = {
	limit?: number
	page?: number
	type?: string
}

type RecordFor<N extends Namespace> = Extract<MemoryRecord, { namespace: N }>

// --- Core functions ---

export async function write(record: MemoryRecord): Promise<void> {
	const valid = memoryRecordSchema.parse(record)
	const { containerTag, customId, content, metadata } = render(valid)
	await getClient().memories.add({ content, containerTag, customId, metadata })
}

export async function query<N extends Namespace>(
	namespace: N,
	opts: QueryOptions
): Promise<RecordFor<N>[]> {
	const res = await getClient().search.memories({
		q: opts.q,
		containerTag: namespace,
		limit: opts.limit,
		threshold: opts.threshold,
		rerank: opts.rerank,
		// Filter server-side — a client-side filter runs after the limit, so a crowded container
		// (e.g. system: decisions + checkpoints) can starve a low-volume type to zero results.
		filters: opts.type
			? { AND: [{ key: 'type', value: opts.type, filterType: 'metadata' }] }
			: undefined
	})
	return res.results
		.map((result) => rehydrate(result.metadata))
		.filter((record): record is RecordFor<N> => record !== null && record.namespace === namespace)
		.filter((record) => (opts.type ? record.type === opts.type : true))
}

// Newest-first enumeration — query needs a q (similarity search); list walks the whole container.
export async function list<N extends Namespace>(
	namespace: N,
	opts: ListOptions = {}
): Promise<RecordFor<N>[]> {
	const res = await getClient().memories.list({
		containerTags: [namespace],
		limit: opts.limit ?? 100,
		page: opts.page,
		sort: 'createdAt',
		order: 'desc',
		// Filter server-side — a client-side filter runs after truncation, so high-volume types bury the rest.
		filters: opts.type
			? { AND: [{ key: 'type', value: opts.type, filterType: 'metadata' }] }
			: undefined
	})
	return res.memories
		.map((memory) => rehydrate(memory.metadata))
		.filter((record): record is RecordFor<N> => record !== null && record.namespace === namespace)
		.filter((record) => (opts.type ? record.type === opts.type : true))
}

// --- Helper functions ---

export function readSelf(opts: QueryOptions): Promise<SelfRecord[]> {
	return query('self', opts)
}

export function queryWorld(opts: QueryOptions): Promise<WorldRecord[]> {
	return query('world', opts)
}

export function readSystem(opts: QueryOptions): Promise<SystemRecord[]> {
	return query('system', opts)
}

export async function readDecisions(opts: QueryOptions): Promise<DecisionRecord[]> {
	return (await query('system', { ...opts, type: 'decision' })) as DecisionRecord[]
}

// Resolve one system record by dedupeKey — supermemory has no get-by-customId, so bounded list+find.
export async function getSystem(dedupeKey: string, type?: string): Promise<SystemRecord | null> {
	const records = await list('system', { limit: 200, type })
	return records.find((r) => r.dedupeKey === dedupeKey) ?? null
}
