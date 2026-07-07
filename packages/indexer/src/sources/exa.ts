import { WebsetSearchBehavior, WebsetSearchStatus } from 'exa-js'
import type { WebsetItemPersonProperties } from 'exa-js'

import { reconcile } from '../seeding/reconcile'
import { getExa } from './exaClient'
import { type Seed, TARGET_COUNT, runDueSeeds } from './seedRunner'
import type { RawItem, SourceAdapter } from './types'

// --- Types & state ---

const POLL_TIMEOUT_MS = 300000
const POLL_INTERVAL_MS = 3000

type Exa = ReturnType<typeof getExa>
type SearchOutcome = 'completed' | 'canceled' | 'timeout'

// --- Core functions ---

export const exa: SourceAdapter = {
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
	const client = getExa()
	const { websetId, searchId } = await ensureSearch(seed, client)
	const outcome = await awaitSearch(client, websetId, searchId)

	// Leave inFlightSearchId set so the next pull resumes the same search.
	if (outcome === 'timeout') return []

	// Drop the dead search for a fresh start, but never dorm on a transient cancel.
	if (outcome === 'canceled') {
		seed.inFlightSearchId = undefined
		seed.lastSearchAt = new Date()
		await seed.save()
		return []
	}

	const people = await listSearchPeople(client, websetId, searchId)
	seed.lastSearchAt = new Date()
	seed.inFlightSearchId = undefined
	seed.totalSeen += people.length
	seed.exhausted = people.length < TARGET_COUNT
	// Dorm a dynamic seed only when nothing new is found — an under-full result still has more.
	if (people.length === 0 && seed.kind !== 'location') seed.dormant = true
	await seed.save()
	return people
}

// --- Helper functions ---

// Persistent webset per seed; resume an in-flight search untouched. Fails loud rather than orphan a
// search whose results (and credits) would be lost.
async function ensureSearch(
	seed: Seed,
	client: Exa
): Promise<{ websetId: string; searchId: string }> {
	let websetId = seed.websetId
	if (!websetId) {
		const webset = await client.websets.create({
			search: { query: seed.query, count: TARGET_COUNT, entity: { type: 'person' } }
		})
		const initialSearchId = webset.searches[0]?.id
		if (!initialSearchId) throw new Error(`webset ${webset.id} created without an initial search`)
		websetId = webset.id
		seed.websetId = websetId
		seed.inFlightSearchId = initialSearchId
		await seed.save()
	}

	let searchId = seed.inFlightSearchId
	if (!searchId) {
		const search = await client.websets.searches.create(websetId, {
			query: seed.query,
			count: TARGET_COUNT,
			entity: { type: 'person' },
			behavior: WebsetSearchBehavior.append
		})
		searchId = search.id
		seed.inFlightSearchId = searchId
		await seed.save()
	}
	return { websetId, searchId }
}

async function awaitSearch(
	client: Exa,
	websetId: string,
	searchId: string
): Promise<SearchOutcome> {
	const deadline = Date.now() + POLL_TIMEOUT_MS
	for (;;) {
		const search = await client.websets.searches.get(websetId, searchId)
		if (search.status === WebsetSearchStatus.completed) return 'completed'
		if (search.status === WebsetSearchStatus.canceled) return 'canceled'
		if (Date.now() > deadline) return 'timeout'
		await sleep(POLL_INTERVAL_MS)
	}
}

async function listSearchPeople(
	client: Exa,
	websetId: string,
	searchId: string
): Promise<RawItem[]> {
	const now = new Date().toISOString()
	const items: RawItem[] = []
	let cursor: string | undefined
	for (;;) {
		const res = await client.websets.items.list(websetId, {
			sourceId: searchId,
			limit: 100,
			cursor
		})
		for (const item of res.data) {
			const p = item.properties
			if (p.type !== 'person') continue
			items.push({
				source: 'exa',
				sourceRef: p.url,
				title: p.person.name,
				text: serialize(p),
				capturedAt: now
			})
		}
		if (!res.hasMore || !res.nextCursor) break
		cursor = res.nextCursor
	}
	return items
}

function serialize(p: WebsetItemPersonProperties): string {
	const { person } = p
	return [
		`Name: ${person.name}`,
		person.position ? `Role: ${person.position}` : '',
		person.company ? `Company: ${person.company.name}` : '',
		person.location ? `Location: ${person.location}` : '',
		`Profile: ${p.url}`,
		p.description ? `Relevance: ${p.description}` : ''
	]
		.filter(Boolean)
		.join('\n')
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
