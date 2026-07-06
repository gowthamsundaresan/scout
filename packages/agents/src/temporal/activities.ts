import { flushTraces } from '@scout/llm'
import { type Intent, list } from '@scout/memory'

import { type Digest, type DigestKey, isEmpty } from '../ceo/digest'
import { type CeoContext, type CeoResult, runCeoGraph } from '../ceo/graph'
import {
	CEO_CLIENT_ID,
	TEMPLATE_AI_ANTIRECOMMEND,
	TEMPLATE_AI_RECOMMEND,
	TEMPLATE_PEOPLE_ANTIRECOMMEND,
	TEMPLATE_PEOPLE_RECOMMEND
} from '../constants'
import { loadEnv } from '../env'
import { type SendResult, registerClient, sendMessage } from '../gateway/client'

// --- Types & state ---

// The four digests, in send order. slug keeps messageIds stable+idempotent across activity retries.
const PLAN: { key: DigestKey; templateId: string; intent: Intent; slug: string }[] = [
	{ key: 'peopleRecommend', templateId: TEMPLATE_PEOPLE_RECOMMEND, intent: 0, slug: 'people-0' },
	{
		key: 'peopleAntiRecommend',
		templateId: TEMPLATE_PEOPLE_ANTIRECOMMEND,
		intent: 1,
		slug: 'people-1'
	},
	{ key: 'updatesRecommend', templateId: TEMPLATE_AI_RECOMMEND, intent: 0, slug: 'ai-0' },
	{ key: 'updatesAntiRecommend', templateId: TEMPLATE_AI_ANTIRECOMMEND, intent: 1, slug: 'ai-1' }
]

// --- Core functions ---

// Reads are split out as their own activity so a flaky supermemory call retries without re-running the LLM.
export async function readContext(): Promise<CeoContext> {
	const [self, world, decisions, lessons] = await Promise.all([
		list('self', { limit: 100 }),
		list('world', { limit: 200 }),
		list('system', { type: 'decision', limit: 200 }),
		list('system', { type: 'lesson', limit: 50 })
	])
	return { self, world, system: [...decisions, ...lessons] }
}

export async function composeDigest(ctx: CeoContext): Promise<CeoResult> {
	const result = await runCeoGraph(ctx)
	await flushTraces()
	return result
}

// One message per non-empty section; messageId is derived from runId so retries never double-send.
export async function sendDigest(runId: string, digest: Digest): Promise<SendResult[]> {
	const env = loadEnv()
	const admin = { baseUrl: env.gatewayUrl, adminSecret: env.gatewayAdminSecret }
	const reg = await registerClient(admin, {
		clientId: CEO_CLIENT_ID,
		name: 'ceo',
		scope: { send: true }
	})
	const auth = { baseUrl: env.gatewayUrl, jwt: reg.jwt }

	const empty = isEmpty(digest)
	const sent: SendResult[] = []
	for (const plan of PLAN) {
		if (empty[plan.key]) continue
		const section = digest[plan.key]
		sent.push(
			await sendMessage(auth, {
				messageId: `${runId}-${plan.slug}`,
				templateId: plan.templateId,
				intent: plan.intent,
				vars: { title: section.title, body: section.body }
			})
		)
	}
	return sent
}
