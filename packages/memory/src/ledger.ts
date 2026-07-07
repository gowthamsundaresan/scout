import { z } from 'zod'

import type { DigestLedger, SystemNoteRecord, SystemRecord } from './types'

// --- Types & state ---

// The four digest sections, in send order. messageId = `${runId}-${slug}`; single-sourced here so
// senders (agents) and messageId parsers (evals) never drift.
export const DIGEST_SLUGS = ['people-0', 'people-1', 'ai-0', 'ai-1'] as const

export type DigestSlug = (typeof DIGEST_SLUGS)[number]

export const digestLedgerSchema: z.ZodType<DigestLedger> = z.object({
	runId: z.string().min(1),
	sections: z.array(
		z.object({
			messageId: z.string().min(1),
			slug: z.string().min(1),
			intent: z.union([z.literal(0), z.literal(1)]),
			title: z.string(),
			body: z.string(),
			targets: z.array(
				z.object({
					dedupeKey: z.string().min(1),
					name: z.string().min(1),
					type: z.enum(['person', 'ai-update', 'opportunity']),
					facts: z.string().optional()
				})
			)
		})
	)
})

// --- Core functions ---

export function digestTraceId(runId: string): string {
	return `ceo-digest-${runId}`
}

export function ledgerToCheckpoint(ledger: DigestLedger): SystemNoteRecord {
	return {
		namespace: 'system',
		type: 'checkpoint',
		dedupeKey: `system/digest/${ledger.runId}`,
		title: `digest ledger ${ledger.runId}`,
		body: JSON.stringify(ledger)
	}
}

export function checkpointToLedger(record: SystemRecord): DigestLedger | null {
	if (record.type !== 'checkpoint') return null
	let json: unknown
	try {
		json = JSON.parse(record.body)
	} catch {
		return null
	}
	const parsed = digestLedgerSchema.safeParse(json)
	return parsed.success ? parsed.data : null
}
