import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'

import { flushTraces } from '@scout/llm'
import {
	type DigestLedger,
	type Intent,
	type SelfRecord,
	type SystemNoteRecord,
	type WorldRecord,
	digestTraceId,
	ledgerToCheckpoint,
	list,
	query,
	write
} from '@scout/memory'

import type { Digest, DigestKey, SectionCards } from '../ceo/digest'
import { type CeoContext, type CeoResult, type RankOutput, runCeoGraph } from '../ceo/graph'
import { CEO_CLIENT_ID, TEMPLATE_DIGEST_PING } from '../constants'
import { loadEnv } from '../env'
import { type SendAuth, type SendResult, registerClient, sendMessage } from '../gateway/client'

// --- Types & state ---

export type SectionJob = {
	messageId: string
	templateId: string
	intent: Intent
	title: string
	body: string
	data?: SectionCards
}

// --- Core functions ---

// Reads are split out as their own activity so a flaky supermemory call retries without re-running the LLM.
export async function readContext(): Promise<CeoContext> {
	const [self, world, decisions] = await Promise.all([
		list('self', { limit: 100 }),
		list('world', { limit: 200 }),
		list('system', { type: 'decision', limit: 200 })
	])
	const lessons = (
		await query('system', { q: lessonQuery(self, world), type: 'lesson', rerank: true, limit: 8 })
	).filter((r): r is SystemNoteRecord => r.type === 'lesson')
	return { self, world, system: decisions, lessons }
}

export async function composeDigest(ctx: CeoContext, runId: string): Promise<CeoResult> {
	const result = await runCeoGraph(ctx, digestTraceId(runId))
	await flushTraces()
	return result
}

// Its own retry unit, so a section-send retry doesn't re-mint a JWT.
export async function ensureClient(): Promise<SendAuth> {
	const env = loadEnv()
	const admin = { baseUrl: env.gatewayUrl, adminSecret: env.gatewayAdminSecret }
	const reg = await registerClient(admin, {
		clientId: CEO_CLIENT_ID,
		name: 'ceo',
		scope: { send: true }
	})
	return { baseUrl: env.gatewayUrl, jwt: reg.jwt }
}

// One section per activity so a mid-digest failure retries only this section, never re-sending earlier ones.
export async function sendSection(auth: SendAuth, job: SectionJob): Promise<SendResult> {
	return sendMessage(auth, {
		messageId: job.messageId,
		templateId: job.templateId,
		intent: job.intent,
		vars: { title: job.title, body: job.body },
		data: job.data,
		// Replies inherit the original message's receivers — this is what routes them to evals.
		receiverIds: [loadEnv().evalsClientId]
	})
}

// The tg one-liner that points at the dashboard. No receiverIds: replies to it feed no loop.
export async function sendPing(
	auth: SendAuth,
	runId: string,
	summary: string
): Promise<SendResult> {
	return sendMessage(auth, {
		messageId: `${runId}-ping`,
		templateId: TEMPLATE_DIGEST_PING,
		intent: 0,
		vars: { summary, url: loadEnv().dashboardUrl }
	})
}

// Persists what was actually sent (the ground truth for eval joins), then hands off to the evals loop.
export async function recordLedger(
	runId: string,
	ranking: RankOutput,
	digest: Digest,
	world: WorldRecord[],
	sentSlugs: string[]
): Promise<void> {
	const ledger = buildLedger(runId, ranking, digest, world, sentSlugs)
	await write(ledgerToCheckpoint(ledger))
	await startDigestEval(ledger)
}

// --- Helper functions ---

// Anchor lesson retrieval on the current theses + pool so rerank surfaces the lessons that apply this cycle.
function lessonQuery(self: SelfRecord[], world: WorldRecord[]): string {
	const theses = self.filter((s) => s.type === 'thesis' || s.type === 'ask').map((s) => s.title)
	const pool = world.slice(0, 10).map((w) => w.title)
	return ['digest lessons', ...theses, ...pool].join('; ')
}

function buildLedger(
	runId: string,
	ranking: RankOutput,
	digest: Digest,
	world: WorldRecord[],
	sentSlugs: string[]
): DigestLedger {
	const byKey = new Map(world.map((w) => [w.dedupeKey, w]))
	const buckets: {
		slug: string
		key: DigestKey
		intent: Intent
		picks: { dedupeKey: string }[]
	}[] = [
		{ slug: 'people-0', key: 'peopleRecommend', intent: 0, picks: ranking.people.recommend },
		{
			slug: 'people-1',
			key: 'peopleAntiRecommend',
			intent: 1,
			picks: ranking.people.antiRecommend
		},
		{ slug: 'ai-0', key: 'updatesRecommend', intent: 0, picks: ranking.updates.recommend },
		{ slug: 'ai-1', key: 'updatesAntiRecommend', intent: 1, picks: ranking.updates.antiRecommend }
	]
	return {
		runId,
		sections: buckets
			.filter((b) => sentSlugs.includes(b.slug))
			.map((b) => ({
				messageId: `${runId}-${b.slug}`,
				slug: b.slug,
				intent: b.intent,
				title: digest[b.key].title,
				body: digest[b.key].body,
				targets: b.picks
					.map((p) => byKey.get(p.dedupeKey))
					.filter((w): w is WorldRecord => w !== undefined)
					.map((w) => ({ dedupeKey: w.dedupeKey, name: w.title, type: w.type, facts: facts(w) }))
			}))
	}
}

function facts(w: WorldRecord): string {
	switch (w.type) {
		case 'person':
			return [w.role, w.whyInteresting, w.summary].filter(Boolean).join(' — ')
		case 'ai-update':
			return `${w.whatHappened} — ${w.whyItMatters}`
		case 'opportunity':
			return w.fit
	}
}

async function startDigestEval(ledger: DigestLedger): Promise<void> {
	const env = loadEnv()
	const connection = await Connection.connect({ address: env.temporalAddress })
	try {
		const client = new Client({ connection, namespace: env.temporalNamespace })
		await client.workflow.start('evalDigestWorkflow', {
			taskQueue: env.evalsTaskQueue,
			workflowId: `eval-digest-${ledger.runId}`,
			args: [ledger]
		})
	} catch (err) {
		if (!(err instanceof WorkflowExecutionAlreadyStartedError)) throw err
	} finally {
		await connection.close()
	}
}
