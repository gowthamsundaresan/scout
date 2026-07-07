import { IngestJob } from '../db/models/ingestJob'
import { reconcile } from '../seeding/reconcile'
import { getExa } from './exaClient'
import { type Seed, TARGET_COUNT, runDueSeeds } from './seedRunner'
import type { RawItem, SourceAdapter } from './types'

// --- Types & state ---

const CATEGORY = process.env.EXA_SEARCH_CATEGORY ?? 'people'

// Plan-free fallback for the websets adapter: plain /search returns unverified candidates and the
// processing-agent does the vetting websets' criteria agents would have. Same name as the websets
// adapter so checkpoints and job source labels stay stable across modes.
export const exaSearch: SourceAdapter = {
	name: 'exa',
	mode: 'pull',
	async fetch() {
		// Isolated so a reconcile failure can't block running already-due seeds.
		try {
			await reconcile()
		} catch (err) {
			console.error(`[indexer] exa reconcile error: ${(err as Error).message}`)
		}
		const items = await runDueSeeds(runSeed)
		return { items, cursor: new Date().toISOString() }
	}
}

async function runSeed(seed: Seed): Promise<RawItem[]> {
	const res = await getExa().searchAndContents(seed.query, {
		numResults: TARGET_COUNT,
		category: CATEGORY as 'people',
		text: true
	})
	const fresh = await dropSeen(res.results)
	const now = new Date().toISOString()

	seed.lastSearchAt = new Date()
	seed.totalSeen += fresh.length
	// /search re-returns the same top results, so under-full is the norm — cool down rather than
	// dorm; the web changes and a re-run costs cents, unlike webset credits.
	seed.exhausted = fresh.length < TARGET_COUNT
	await seed.save()

	return fresh.map((result) => ({
		source: 'exa',
		sourceRef: result.url,
		title: result.title ?? undefined,
		text: result.text,
		capturedAt: now
	}))
}

// --- Helper functions ---

// Past ingest jobs double as the seen-URL ledger, so repeat results never re-pay the processing-agent.
async function dropSeen<T extends { url: string }>(results: T[]): Promise<T[]> {
	if (!results.length) return results
	const seen = new Set(
		await IngestJob.distinct('item.sourceRef', {
			source: 'exa',
			'item.sourceRef': { $in: results.map((result) => result.url) }
		})
	)
	return results.filter((result) => !seen.has(result.url))
}
