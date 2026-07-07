import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryRecord, SystemRecord } from '@scout/memory'

// The honesty bar: nothing below hand-writes a lesson. Stubs sit only at the process boundaries
// (supermemory store, LLM transport, Temporal client); the graph, prompts, ledger, judge plumbing
// and observer all run for real. The test passes only if the judge's own suggestion re-enters the
// next cycle's rank prompt.

const store = vi.hoisted(() => new Map<string, MemoryRecord>())

const LESSON = 'Be specific about shipped work when recommending people.'

const CANNED = vi.hoisted(() => ({
	'ceo-rank': JSON.stringify({
		people: {
			recommend: [{ dedupeKey: 'world/person/jane', reason: 'thesis fit' }],
			antiRecommend: []
		},
		updates: { recommend: [], antiRecommend: [] }
	}),
	'ceo-compose': JSON.stringify({
		people: {
			recommend: {
				headline: 'One person worth your time',
				entries: [{ name: 'jane', why: 'ships fast', message: 'Hey Jane — saw your work.' }]
			},
			antiRecommend: { entries: [] }
		},
		updates: {
			recommend: { headline: '', entries: [] },
			antiRecommend: { entries: [] }
		}
	}),
	'evals-digest-judge': JSON.stringify({
		score: 0.62,
		dimensions: { grounding: 0.9, specificity: 0.3, thesisFit: 0.8, messageQuality: 0.6 },
		issues: ['why-lines are generic'],
		suggestion: 'Be specific about shipped work when recommending people.'
	})
}))

vi.mock('@scout/memory', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@scout/memory')>()
	const matches = (r: MemoryRecord, namespace: string, type?: string) =>
		r.namespace === namespace && (!type || r.type === type)
	return {
		...actual,
		write: async (record: MemoryRecord) => {
			store.set(record.dedupeKey, record)
		},
		list: async (namespace: string, opts: { type?: string } = {}) =>
			[...store.values()].filter((r) => matches(r, namespace, opts.type)),
		query: async (namespace: string, opts: { type?: string } = {}) =>
			[...store.values()].filter((r) => matches(r, namespace, opts.type)),
		getSystem: async (dedupeKey: string) => store.get(dedupeKey) ?? null
	}
})

vi.mock('@scout/llm', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@scout/llm')>()
	return {
		...actual,
		complete: async (meta: { name: string }) => CANNED[meta.name as keyof typeof CANNED],
		score: () => {},
		flushTraces: async () => {}
	}
})

vi.mock('@temporalio/client', () => ({
	Connection: { connect: async () => ({ close: async () => {} }) },
	Client: class {
		workflow = { start: async () => ({}) }
	},
	WorkflowExecutionAlreadyStartedError: class extends Error {}
}))

process.env.SCOUT_GATEWAY_URL = 'http://localhost:0'
process.env.SCOUT_GATEWAY_ADMIN_SECRET = 'test'

const { composeDigest, readContext, recordLedger, rankPrompt } = await import('@scout/agents')
const { checkpointToLedger } = await import('@scout/memory')
const { judgeSection, observeSections } = await import('../src/temporal/activities')

const seed = () => {
	store.clear()
	store.set('self/thesis/agents', {
		namespace: 'self',
		type: 'thesis',
		dedupeKey: 'self/thesis/agents',
		title: 'agentic firms',
		body: 'self-improving agent teams win'
	})
	store.set('world/person/jane', {
		namespace: 'world',
		type: 'person',
		dedupeKey: 'world/person/jane',
		title: 'jane',
		summary: 'builds agent infra',
		tags: ['ai'],
		salience: 0.9,
		source: { name: 'exa', url: 'https://x.com/jane', fetchedAt: '2026-07-06T00:00:00Z' },
		whyInteresting: 'ships fast'
	})
}

beforeEach(seed)

describe('autonomous loop', () => {
	it('feeds the judge suggestion back into the next rank prompt, hands-free', async () => {
		const ctx1 = await readContext()
		expect(ctx1.lessons).toHaveLength(0)

		const { digest, ranking } = await composeDigest(ctx1, 'run-abc')
		expect(digest.peopleRecommend.body).toContain('jane')

		await recordLedger('run-abc', ranking, digest, ctx1.world, ['people-0'])
		const checkpoint = store.get('system/digest/run-abc')
		expect(checkpoint).toBeDefined()

		const ledger = checkpointToLedger(checkpoint as SystemRecord)
		expect(ledger).not.toBeNull()
		expect(ledger!.sections[0].targets[0].dedupeKey).toBe('world/person/jane')
		expect(ledger!.sections[0].body).toContain('jane')

		const judgements = await Promise.all(ledger!.sections.map((_, i) => judgeSection(ledger!, i)))
		await observeSections(ledger!, judgements)

		const ctx2 = await readContext()
		expect(ctx2.lessons.map((l) => l.body)).toContain(LESSON)

		const prompt = rankPrompt(
			ctx2.self,
			ctx2.world.map((w) => ({
				dedupeKey: w.dedupeKey,
				type: w.type,
				title: w.title,
				summary: w.summary,
				salience: w.salience
			})),
			[],
			ctx2.lessons
		)
		expect(prompt).toContain('LESSONS (apply these)')
		expect(prompt).toContain(LESSON)
	})

	it('observing the same judgement twice upserts a single lesson', async () => {
		const ctx = await readContext()
		const { digest, ranking } = await composeDigest(ctx, 'run-abc')
		await recordLedger('run-abc', ranking, digest, ctx.world, ['people-0'])
		const ledger = checkpointToLedger(store.get('system/digest/run-abc') as SystemRecord)!

		const judgements = await Promise.all(ledger.sections.map((_, i) => judgeSection(ledger, i)))
		await observeSections(ledger, judgements)
		await observeSections(ledger, judgements)

		const lessons = [...store.values()].filter((r) => r.type === 'lesson')
		expect(lessons).toHaveLength(1)
		expect(lessons[0].dedupeKey).toMatch(/^system\/lesson\/specificity\//)
	})
})
