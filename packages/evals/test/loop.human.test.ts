import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DecisionRecord, MemoryRecord } from '@scout/memory'

// Phase-2 honesty bar: a canned Telegram reply (as forwarded by the gateway) must produce a
// rejected decision + a targeting lesson that both re-enter the next cycle's rank prompt.
// Same boundary-only stubbing as loop.autonomous.test.ts; ledger lookup, judge post-filtering,
// decision/lesson writes and prompt assembly all run for real.

const store = vi.hoisted(() => new Map<string, MemoryRecord>())

const LESSON = 'Skip founders who have not shipped a product yet.'

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
	// The judge tries to rule on a target that was never in the section; post-filtering must drop it.
	'evals-feedback-judge': JSON.stringify({
		verdicts: [
			{ targetKey: 'world/person/jane', verdict: 'rejected', reason: 'too early-stage' },
			{ targetKey: 'world/person/ghost', verdict: 'accepted', reason: 'hallucinated' }
		],
		overall: { score: 0.3, lesson: 'Skip founders who have not shipped a product yet.' }
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
process.env.SCOUT_DASHBOARD_URL = 'http://localhost:3000'

const { composeDigest, readContext, recordLedger, rankPrompt } = await import('@scout/agents')
const { locateSection, judgeReply, recordFeedback } = await import('../src/temporal/activities')

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

// A ceo cycle whose ledger the reply will land on.
const runCycle = async () => {
	const ctx = await readContext()
	const { digest, ranking } = await composeDigest(ctx, 'run-abc')
	await recordLedger('run-abc', ranking, digest, ctx.world, ['people-0'])
}

const FORWARD = {
	messageId: 'tg-777-42',
	fromClientId: 'tg-ingress',
	replyToMessageId: 'run-abc-people-0',
	payload: { text: 'not interested in jane — too early-stage' }
}

describe('human loop', () => {
	it('turns a reply into a decision + lesson that reshape the next prompt', async () => {
		await runCycle()

		const located = await locateSection(FORWARD.replyToMessageId)
		expect(located).not.toBeNull()
		expect(located!.runId).toBe('run-abc')

		const result = await judgeReply(located!, FORWARD.payload.text)
		expect(result.verdicts.map((v) => v.targetKey)).toEqual(['world/person/jane'])

		await recordFeedback(located!, result)

		const decision = store.get('system/decision/world/person/jane') as DecisionRecord
		expect(decision).toBeDefined()
		expect(decision.verdict).toBe('rejected')
		expect(decision.targetKey).toBe('world/person/jane')

		const ctx2 = await readContext()
		expect(ctx2.lessons.map((l) => l.body)).toContain(LESSON)

		const decided = ctx2.system
			.filter((r): r is DecisionRecord => r.type === 'decision')
			.map((r) => r.targetKey)
		const prompt = rankPrompt(
			ctx2.self,
			ctx2.world.map((w) => ({
				dedupeKey: w.dedupeKey,
				type: w.type,
				title: w.title,
				summary: w.summary,
				salience: w.salience
			})),
			decided,
			ctx2.lessons
		)
		expect(prompt).toContain(LESSON)
		expect(prompt).toMatch(/ALREADY DECIDED \(skip\):[\s\S]*world\/person\/jane/)
	})

	it('recording the same feedback twice upserts one decision and one lesson', async () => {
		await runCycle()
		const located = await locateSection(FORWARD.replyToMessageId)
		const result = await judgeReply(located!, FORWARD.payload.text)

		await recordFeedback(located!, result)
		await recordFeedback(located!, result)

		expect([...store.values()].filter((r) => r.type === 'decision')).toHaveLength(1)
		expect([...store.values()].filter((r) => r.type === 'lesson')).toHaveLength(1)
	})

	it('returns null for replies that match no ledger', async () => {
		await runCycle()
		expect(await locateSection('run-zzz-people-0')).toBeNull()
		expect(await locateSection('garbage')).toBeNull()
	})
})
