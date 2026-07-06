import { flushTraces } from '@scout/llm'
import { list } from '@scout/memory'

import { type Digest, isEmpty } from '../ceo/digest'
import { type CeoContext, type CeoResult, runCeoGraph } from '../ceo/graph'
import { CEO_CLIENT_ID, TEMPLATE_ANTIRECOMMEND, TEMPLATE_RECOMMEND } from '../constants'
import { loadEnv } from '../env'
import { type SendResult, registerClient, sendMessage } from '../gateway/client'

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

// messageId is derived from the workflow runId so activity retries never double-send.
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
	if (!empty.recommend) {
		sent.push(
			await sendMessage(auth, {
				messageId: `${runId}-0`,
				templateId: TEMPLATE_RECOMMEND,
				intent: 0,
				vars: { title: digest.recommend.title, body: digest.recommend.body }
			})
		)
	}
	if (!empty.antiRecommend) {
		sent.push(
			await sendMessage(auth, {
				messageId: `${runId}-1`,
				templateId: TEMPLATE_ANTIRECOMMEND,
				intent: 1,
				vars: { title: digest.antiRecommend.title, body: digest.antiRecommend.body }
			})
		)
	}
	return sent
}
