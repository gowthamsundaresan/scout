import { flushTraces } from '@scout/llm'
import { type DigestLedger, type LedgerSection, digestTraceId, list } from '@scout/memory'

import { judgeDigestSection } from '../judges/digest'
import { type FeedbackJudgeResult, judgeFeedback } from '../judges/feedback'
import { loadLedger } from '../ledger'
import { type SectionJudgement, observeDigest, observeFeedback } from '../observer/observer'

// --- Types & state ---

export type ReplyForward = {
	messageId: string
	fromClientId?: string
	replyToMessageId: string
	payload: { text?: string; repliedText?: string }
}

export type LocatedSection = { runId: string; section: LedgerSection }

// --- Core functions ---

// One section per activity: a flaky judge call retries alone, and sections judge in parallel.
export async function judgeSection(ledger: DigestLedger, index: number): Promise<SectionJudgement> {
	const section = ledger.sections[index]
	const theses = (await list('self', { limit: 100 })).filter(
		(s) => s.type === 'thesis' || s.type === 'ask' || s.type === 'offer'
	)
	const result = await judgeDigestSection({
		traceId: digestTraceId(ledger.runId),
		section,
		theses
	})
	await flushTraces()
	return { slug: section.slug, messageId: section.messageId, result }
}

export async function observeSections(
	ledger: DigestLedger,
	judgements: SectionJudgement[]
): Promise<void> {
	await observeDigest(ledger, judgements)
}

export async function locateSection(messageId: string): Promise<LocatedSection | null> {
	const ledger = await loadLedger(messageId)
	const section = ledger?.sections.find((s) => s.messageId === messageId)
	if (!ledger || !section) return null
	return { runId: ledger.runId, section }
}

export async function judgeReply(
	located: LocatedSection,
	replyText: string
): Promise<FeedbackJudgeResult> {
	const result = await judgeFeedback({
		traceId: digestTraceId(located.runId),
		section: located.section,
		replyText
	})
	await flushTraces()
	return result
}

export async function recordFeedback(
	located: LocatedSection,
	result: FeedbackJudgeResult
): Promise<void> {
	await observeFeedback(located.runId, located.section, result)
}
