import { list } from '@scout/memory'
import type { MemoryRecord } from '@scout/memory'

import { SearchSeed } from '../db/models/searchSeed'
import { exaQuery } from '../sources/exaQuery'
import { seedKey, seedKind, seedWorthy } from './seedWorthy'

// --- Types & state ---

const SEED_SALIENCE_THRESHOLD = Number(process.env.SEED_SALIENCE_THRESHOLD ?? 0.6)
const MAX_SEEDS_PER_RECONCILE = Number(process.env.MAX_SEEDS_PER_RECONCILE ?? 10)
const LIST_LIMIT = 100

// --- Core functions ---

// New seed-worthy knowledge → SearchSeeds (one query synth each), deduped by unique key.
export async function reconcile(): Promise<number> {
	const candidates = await findCandidates()
	const existing = new Set(
		(await SearchSeed.find().select('key').lean<{ key: string }[]>()).map((s) => s.key)
	)
	const fresh = candidates
		.filter((record) => !existing.has(seedKey(record)))
		.slice(0, MAX_SEEDS_PER_RECONCILE)

	let created = 0
	for (const record of fresh) {
		try {
			const query = await exaQuery(record)
			if (!query) {
				// Tombstone so an empty synth isn't re-charged to the LLM every tick.
				await SearchSeed.create({
					kind: seedKind(record),
					key: seedKey(record),
					query: record.title,
					origin: record.dedupeKey,
					dormant: true
				})
				continue
			}
			await SearchSeed.create({
				kind: seedKind(record),
				key: seedKey(record),
				query,
				origin: record.dedupeKey
			})
			created++
		} catch (err) {
			// Transient — skip; the record stays a candidate and retries next reconcile.
			console.error(`[indexer] reconcile failed for ${record.dedupeKey}: ${(err as Error).message}`)
		}
	}
	return created
}

// --- Helper functions ---

// Query the seed-worthy world types directly — listing world unfiltered lets our own people records
// bury them.
async function findCandidates(): Promise<MemoryRecord[]> {
	const [self, opportunities, aiUpdates] = await Promise.all([
		list('self', { limit: LIST_LIMIT }),
		list('world', { type: 'opportunity', limit: LIST_LIMIT }),
		list('world', { type: 'ai-update', limit: LIST_LIMIT })
	])
	return [...self, ...opportunities, ...aiUpdates].filter((record) =>
		seedWorthy(record, SEED_SALIENCE_THRESHOLD)
	)
}
