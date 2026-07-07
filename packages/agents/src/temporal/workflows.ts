import { log, proxyActivities, workflowInfo } from '@temporalio/workflow'

import type { DigestSlug, Intent } from '@scout/memory'

import { type DigestKey, pingSummary } from '../ceo/digest'
import {
	TEMPLATE_AI_ANTIRECOMMEND,
	TEMPLATE_AI_RECOMMEND,
	TEMPLATE_PEOPLE_ANTIRECOMMEND,
	TEMPLATE_PEOPLE_RECOMMEND
} from '../constants'
import type * as activities from './activities'

const { readContext, composeDigest, ensureClient, sendSection, sendPing, recordLedger } =
	proxyActivities<typeof activities>({
		startToCloseTimeout: '5 minutes',
		retry: { maximumAttempts: 3 }
	})

// The four digests, in send order. slug keeps messageIds stable+idempotent across activity retries.
const PLAN: { key: DigestKey; templateId: string; intent: Intent; slug: DigestSlug }[] = [
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

// The 6-hourly digest. Temporal owns the durable lifecycle; the LangGraph reasoning lives in composeDigest.
export async function ceoDigestWorkflow(): Promise<{ sent: number }> {
	const ctx = await readContext()
	const runId = workflowInfo().runId
	const { digest, cards, ranking } = await composeDigest(ctx, runId)
	const auth = await ensureClient()

	const sentSlugs: string[] = []
	for (const p of PLAN) {
		const section = digest[p.key]
		if (!section.body.trim()) continue
		await sendSection(auth, {
			messageId: `${runId}-${p.slug}`,
			templateId: p.templateId,
			intent: p.intent,
			title: section.title,
			body: section.body,
			data: cards[p.key]
		})
		sentSlugs.push(p.slug)
	}

	if (sentSlugs.length === 0) {
		log.warn('ceo digest produced no sendable sections', { runId })
	} else {
		// Ledger first — it is the eval ground truth; the ping is best-effort notification.
		await recordLedger(runId, ranking, digest, ctx.world, sentSlugs)
		await sendPing(auth, runId, pingSummary(cards))
	}
	return { sent: sentSlugs.length }
}
