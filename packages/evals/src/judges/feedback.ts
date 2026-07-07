import { z } from 'zod'

import { complete, safeJson } from '@scout/llm'
import type { LedgerSection } from '@scout/memory'

import { modelFor } from '../models'

// --- Types & state ---

export const FEEDBACK_JUDGE_SYSTEM = `You are Scout's feedback judge. The user replied in free text
to one section of a delivered digest. TARGETS lists exactly who/what that section contained, each
with a targetKey. Interpret the reply and rule per target.

Rules:
- Only emit a verdict for a target the reply actually takes a position on (by name, description,
  or unambiguous reference like "her" / "the first one" / "all of these"). Say nothing about targets
  the reply ignores.
- verdict is 'accepted' (user wants it / will act on it) or 'rejected' (user dismisses it).
- reason: a short paraphrase of the user's stated reason, or "no reason given".
- overall.score (0..1): how well the section matched what the user wanted, per the reply.
- overall.lesson: ONE imperative, generalizable selection lesson if the reply implies one — omit
  otherwise (bad: "skip jane"; good: "skip founders without a shipped product").

Return ONLY JSON:
{ "verdicts": [{"targetKey":"...","verdict":"accepted"|"rejected","reason":"..."}],
"overall": {"score":0..1, "lesson":"..."} }`

export const feedbackJudgeSchema = z.object({
	verdicts: z.array(
		z.object({
			targetKey: z.string().min(1),
			verdict: z.enum(['accepted', 'rejected']),
			reason: z.string()
		})
	),
	overall: z.object({
		score: z.number().min(0).max(1),
		lesson: z.string().optional()
	})
})

export type FeedbackJudgeResult = z.infer<typeof feedbackJudgeSchema>

// Neutral fallback on malformed judge output: no verdicts, no lesson — never a fabricated decision.
export const NEUTRAL_FEEDBACK: FeedbackJudgeResult = { verdicts: [], overall: { score: 0.5 } }

// --- Core functions ---

export async function judgeFeedback(input: {
	traceId: string
	section: LedgerSection
	replyText: string
}): Promise<FeedbackJudgeResult> {
	const content = await complete(
		{
			name: 'evals-feedback-judge',
			model: modelFor('evals-feedback-judge'),
			traceId: input.traceId
		},
		FEEDBACK_JUDGE_SYSTEM,
		feedbackPrompt(input.section, input.replyText)
	)
	const parsed = safeJson(content, feedbackJudgeSchema) ?? NEUTRAL_FEEDBACK
	// A hallucinated targetKey must never become a decision record.
	const known = new Set(input.section.targets.map((t) => t.dedupeKey))
	return { ...parsed, verdicts: parsed.verdicts.filter((v) => known.has(v.targetKey)) }
}

// --- Helper functions ---

export function feedbackPrompt(section: LedgerSection, replyText: string): string {
	return [
		block(
			'TARGETS',
			section.targets.map((t) => `- ${t.dedupeKey} — ${t.name} [${t.type}]: ${t.facts ?? ''}`)
		),
		block(`SECTION (${section.slug}, as delivered)`, [`${section.title}\n\n${section.body}`]),
		block('USER REPLY', [replyText])
	].join('\n\n')
}

function block(heading: string, lines: string[]): string {
	return `${heading}:\n${lines.length ? lines.join('\n') : '- (none)'}`
}
