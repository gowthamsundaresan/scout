import { flushTraces, score } from '@scout/llm'
import {
	type DecisionRecord,
	type DigestLedger,
	type LedgerSection,
	type LedgerTarget,
	digestTraceId,
	write
} from '@scout/memory'

import type { DigestJudgeResult } from '../judges/digest'
import type { FeedbackJudgeResult } from '../judges/feedback'
import { lessonRecord } from './lessons'

// --- Types & state ---

export type SectionJudgement = {
	slug: string
	messageId: string
	result: DigestJudgeResult
}

// --- Core functions ---

// Scores land on the ceo's own trace; suggestions become individual lesson memories the next
// readContext retrieves — this write is what closes the autonomous loop.
export async function observeDigest(
	ledger: DigestLedger,
	judgements: SectionJudgement[]
): Promise<void> {
	for (const j of judgements) {
		score({
			traceId: digestTraceId(ledger.runId),
			name: `digest.${j.slug}`,
			value: j.result.score,
			comment: j.result.issues.join('; ') || undefined
		})
		if (j.result.suggestion) {
			await write(lessonRecord(weakestDimension(j.result), j.result.suggestion, j.messageId))
		}
	}
	await flushTraces()
}

// Verdicts become decision records (feeding the next cycle's skip list), the lesson becomes a
// targeting memory, and the match score lands on the ceo's trace — the human loop's write side.
export async function observeFeedback(
	runId: string,
	section: LedgerSection,
	result: FeedbackJudgeResult
): Promise<void> {
	const byKey = new Map(section.targets.map((t) => [t.dedupeKey, t]))
	for (const v of result.verdicts) {
		const target = byKey.get(v.targetKey)
		if (!target) continue
		await write(decisionRecord(section, target, v))
	}
	if (result.overall.lesson) {
		await write(lessonRecord('targeting', result.overall.lesson, section.messageId))
	}
	score({
		traceId: digestTraceId(runId),
		name: 'feedback.match',
		value: result.overall.score
	})
	await flushTraces()
}

// --- Helper functions ---

function weakestDimension(result: DigestJudgeResult): string {
	return Object.entries(result.dimensions).sort((a, b) => a[1] - b[1])[0][0]
}

function decisionRecord(
	section: LedgerSection,
	target: LedgerTarget,
	v: FeedbackJudgeResult['verdicts'][number]
): DecisionRecord {
	return {
		namespace: 'system',
		type: 'decision',
		dedupeKey: `system/decision/${target.dedupeKey}`,
		title: `${v.verdict}: ${target.name}`,
		body: v.reason || 'no reason given',
		targetKey: target.dedupeKey,
		targetType: target.type,
		intent: section.intent,
		verdict: v.verdict,
		decidedAt: new Date().toISOString()
	}
}
