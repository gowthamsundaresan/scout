import { log, proxyActivities } from '@temporalio/workflow'

import type { DigestLedger } from '@scout/memory'

import type * as activities from './activities'
import type { ReplyForward } from './activities'

const { judgeSection, observeSections, locateSection, judgeReply, recordFeedback } =
	proxyActivities<typeof activities>({
		startToCloseTimeout: '5 minutes',
		retry: { maximumAttempts: 3 }
	})

// The autonomous half of the loop: every digest gets judged and observed, no human required.
export async function evalDigestWorkflow(ledger: DigestLedger): Promise<{ judged: number }> {
	const judgements = await Promise.all(ledger.sections.map((_, i) => judgeSection(ledger, i)))
	await observeSections(ledger, judgements)
	return { judged: judgements.length }
}

// The human half: a Telegram reply, forwarded by the gateway, becomes decisions + lessons.
export async function evalReplyWorkflow(forward: ReplyForward): Promise<{ handled: boolean }> {
	const text = forward.payload?.text
	if (!text || !forward.replyToMessageId) return { handled: false }

	const located = await locateSection(forward.replyToMessageId)
	if (!located) {
		log.warn('no ledger section for reply', { replyToMessageId: forward.replyToMessageId })
		return { handled: false }
	}

	const result = await judgeReply(located, text)
	await recordFeedback(located, result)
	return { handled: true }
}
