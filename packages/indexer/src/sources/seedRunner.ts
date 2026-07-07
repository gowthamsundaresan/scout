import type { HydratedDocument } from 'mongoose'

import { SearchSeed } from '../db/models/searchSeed'
import type { SearchSeedDoc } from '../db/models/searchSeed'
import type { RawItem } from './types'

// --- Types & state ---

const COOLDOWN_MS = Number(process.env.SEARCH_COOLDOWN_DAYS ?? 3) * 24 * 60 * 60 * 1000
const MIN_GAP_MS = 60 * 1000
const MAX_DYNAMIC_PER_DAY = Number(process.env.MAX_DYNAMIC_SEARCHES_PER_DAY ?? 10)

export const TARGET_COUNT = Number(process.env.SEARCH_TARGET_COUNT ?? 25)

export type Seed = HydratedDocument<SearchSeedDoc>

// --- Core functions ---

export async function runDueSeeds(runSeed: (seed: Seed) => Promise<RawItem[]>): Promise<RawItem[]> {
	const now = Date.now()
	let dynamicBudget = MAX_DYNAMIC_PER_DAY - (await dynamicSearchesToday())
	const seeds = await SearchSeed.find({ dormant: false })

	const items: RawItem[] = []
	for (const seed of seeds) {
		if (!isDue(seed, now)) continue
		// A resume re-polls an already-charged search, so only new searches spend budget.
		const issuesNewSearch = !seed.inFlightSearchId
		if (seed.kind !== 'location' && issuesNewSearch) {
			if (dynamicBudget <= 0) continue
			dynamicBudget--
		}
		try {
			items.push(...(await runSeed(seed)))
		} catch (err) {
			console.error(`[indexer] exa seed ${seed.key} failed: ${(err as Error).message}`)
		}
	}
	return items
}

// --- Helper functions ---

function isDue(seed: Seed, now: number): boolean {
	if (seed.inFlightSearchId) return true
	if (!seed.lastSearchAt) return true
	const elapsed = now - seed.lastSearchAt.getTime()
	return seed.exhausted ? elapsed >= COOLDOWN_MS : elapsed >= MIN_GAP_MS
}

async function dynamicSearchesToday(): Promise<number> {
	const since = new Date()
	since.setHours(0, 0, 0, 0)
	return SearchSeed.countDocuments({ kind: { $ne: 'location' }, lastSearchAt: { $gte: since } })
}
