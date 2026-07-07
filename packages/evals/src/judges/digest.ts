import { z } from 'zod'

import { complete, safeJson } from '@scout/llm'
import type { LedgerSection, SelfRecord } from '@scout/memory'

import { modelFor } from '../models'

// --- Types & state ---

export const DIGEST_JUDGE_SYSTEM = `You are Scout's digest judge. You evaluate one section of an
already-delivered digest against ground truth: the TARGETS list is exactly what the ceo agent knew
about each person/update when it wrote the section, and USER THESES is what the user cares about.

Score four dimensions, each 0..1:
- grounding: every factual claim in the section is backed by its target's facts. Any claim about a
  target that its facts do not support is a grounding failure — this is the hallucination check.
- specificity: entries reference concrete, real details (shipped work, named projects) rather than
  generic filler ("interesting person in AI").
- thesisFit: the selection and framing serve the user's stated theses/asks/offers.
- messageQuality: outreach messages / why-lines are sharp, honest, and usable as written.

Return ONLY JSON:
{ "score": <0..1 overall>, "dimensions": {"grounding":..,"specificity":..,"thesisFit":..,"messageQuality":..},
"issues": ["<specific problem>", ...],
"suggestion": "<ONE imperative, generalizable lesson for future digests — omit if the section needs none>" }
The suggestion must generalize beyond these specific targets (bad: "drop Jane"; good: "only recommend
people whose facts include shipped work, not just role titles").`

const dimension = z.number().min(0).max(1)

export const digestJudgeSchema = z.object({
	score: z.number().min(0).max(1),
	dimensions: z.object({
		grounding: dimension,
		specificity: dimension,
		thesisFit: dimension,
		messageQuality: dimension
	}),
	issues: z.array(z.string()),
	suggestion: z.string().optional()
})

export type DigestJudgeResult = z.infer<typeof digestJudgeSchema>

// Neutral fallback on malformed judge output: no score signal, no lesson — never a fabricated verdict.
export const NEUTRAL_JUDGE: DigestJudgeResult = {
	score: 0.5,
	dimensions: { grounding: 0.5, specificity: 0.5, thesisFit: 0.5, messageQuality: 0.5 },
	issues: []
}

// --- Core functions ---

export async function judgeDigestSection(input: {
	traceId: string
	section: LedgerSection
	theses: SelfRecord[]
}): Promise<DigestJudgeResult> {
	const content = await complete(
		{ name: 'evals-digest-judge', model: modelFor('evals-digest-judge'), traceId: input.traceId },
		DIGEST_JUDGE_SYSTEM,
		judgePrompt(input.section, input.theses)
	)
	return safeJson(content, digestJudgeSchema) ?? NEUTRAL_JUDGE
}

// --- Helper functions ---

export function judgePrompt(section: LedgerSection, theses: SelfRecord[]): string {
	return [
		block(
			'USER THESES',
			theses.map((s) => `- [${s.type}] ${s.title}: ${s.body}`)
		),
		block(
			'TARGETS (ground truth)',
			section.targets.map((t) => `- ${t.name} [${t.type}]: ${t.facts ?? '(no facts)'}`)
		),
		block(`SECTION (${section.slug}, as delivered)`, [`${section.title}\n\n${section.body}`])
	].join('\n\n')
}

function block(heading: string, lines: string[]): string {
	return `${heading}:\n${lines.length ? lines.join('\n') : '- (none)'}`
}
