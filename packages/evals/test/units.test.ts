import { describe, expect, it } from 'vitest'

import { safeJson } from '@scout/llm'

import { NEUTRAL_JUDGE, digestJudgeSchema } from '../src/judges/digest'
import { parseRunId } from '../src/ledger'
import { lessonRecord } from '../src/observer/lessons'

describe('parseRunId', () => {
	it('strips the slug suffix from a hyphenated runId', () => {
		expect(parseRunId('0198c9a2-7f3e-people-0')).toBe('0198c9a2-7f3e')
		expect(parseRunId('0198c9a2-7f3e-ai-1')).toBe('0198c9a2-7f3e')
	})

	it('survives a runId that itself ends in a slug-like fragment', () => {
		expect(parseRunId('run-ai-0-people-0')).toBe('run-ai-0')
	})

	it('returns null for unknown suffixes or bare slugs', () => {
		expect(parseRunId('run-abc-people-2')).toBeNull()
		expect(parseRunId('people-0')).toBeNull()
		expect(parseRunId('tg-1234-5678')).toBeNull()
	})
})

describe('lessonRecord', () => {
	it('derives the same dedupeKey for identical suggestions (dedup-on-write)', () => {
		const a = lessonRecord('specificity', 'Be specific about shipped work.', 'run-1-people-0')
		const b = lessonRecord('specificity', 'Be specific about shipped work.', 'run-2-people-0')
		expect(a.dedupeKey).toBe(b.dedupeKey)
	})

	it('keeps distinct suggestions apart and bounds the slug length', () => {
		const a = lessonRecord('specificity', 'Be specific about shipped work.', 'k')
		const b = lessonRecord('specificity', 'Prefer people with public repos.', 'k')
		expect(a.dedupeKey).not.toBe(b.dedupeKey)

		const long = lessonRecord('grounding', 'x'.repeat(500), 'k')
		expect(long.dedupeKey.length).toBeLessThanOrEqual('system/lesson/grounding/'.length + 80)
	})
})

describe('digestJudgeSchema', () => {
	it('parses a valid judgement, with suggestion optional', () => {
		const valid = {
			score: 0.7,
			dimensions: { grounding: 1, specificity: 0.5, thesisFit: 0.8, messageQuality: 0.6 },
			issues: []
		}
		expect(safeJson(JSON.stringify(valid), digestJudgeSchema)).toEqual(valid)
	})

	it('falls back to null on garbage or out-of-range scores', () => {
		expect(safeJson('garbage', digestJudgeSchema)).toBeNull()
		expect(safeJson(JSON.stringify({ ...NEUTRAL_JUDGE, score: 1.5 }), digestJudgeSchema)).toBeNull()
	})
})
