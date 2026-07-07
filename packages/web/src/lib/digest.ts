import type { GatewayMessage, SectionCards } from './types'

// --- Types & state ---

// Mirror of @scout/memory DIGEST_SLUGS; runIds contain hyphens, so parse by known slug suffix
// (same approach as scout/packages/evals/src/ledger.ts).
export const DIGEST_SLUGS = ['people-0', 'people-1', 'ai-0', 'ai-1'] as const
export type DigestSlug = (typeof DIGEST_SLUGS)[number]

export type DigestRun = {
	runId: string
	createdAt: string
	sections: { slug: DigestSlug; message: GatewayMessage }[]
}

export type SectionPair = { recommend?: GatewayMessage; anti?: GatewayMessage }
export type GroupedRun = { people: SectionPair; ai: SectionPair }

// --- Core functions ---

export function parseRunId(messageId: string): { runId: string; slug: DigestSlug } | null {
	for (const slug of DIGEST_SLUGS) {
		if (messageId.endsWith(`-${slug}`)) {
			return { runId: messageId.slice(0, -(slug.length + 1)), slug }
		}
	}
	return null
}

export function groupRuns(messages: GatewayMessage[]): DigestRun[] {
	const runs = new Map<string, DigestRun>()
	for (const message of messages) {
		const parsed = parseRunId(message.messageId)
		if (!parsed) continue
		const run = runs.get(parsed.runId) ?? {
			runId: parsed.runId,
			createdAt: message.createdAt,
			sections: []
		}
		run.sections.push({ slug: parsed.slug, message })
		if (message.createdAt > run.createdAt) run.createdAt = message.createdAt
		runs.set(parsed.runId, run)
	}
	return [...runs.values()]
		.map((run) => ({
			...run,
			sections: [...run.sections].sort(
				(a, b) => DIGEST_SLUGS.indexOf(a.slug) - DIGEST_SLUGS.indexOf(b.slug)
			)
		}))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// slug → position in the People/AI × recommend/anti grid
export function groupSections(run: DigestRun): GroupedRun {
	const bySlug = new Map(run.sections.map((s) => [s.slug, s.message]))
	return {
		people: { recommend: bySlug.get('people-0'), anti: bySlug.get('people-1') },
		ai: { recommend: bySlug.get('ai-0'), anti: bySlug.get('ai-1') }
	}
}

export function cardsOf(message: GatewayMessage): SectionCards | null {
	const data = message.payload?.data
	return data && Array.isArray(data.entries) ? data : null
}
