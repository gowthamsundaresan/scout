import { z } from 'zod'

import type { RawItem, SourceAdapter } from './types'

export const grokPayloadSchema = z.object({
	text: z.string().min(1),
	sourceRef: z.string().optional(),
	capturedAt: z.string().min(1)
})

export type GrokPayload = z.infer<typeof grokPayloadSchema>

export const grok: SourceAdapter = {
	name: 'grok',
	mode: 'push',
	toRawItem(payload: unknown): RawItem {
		const parsed = grokPayloadSchema.safeParse(payload)
		if (!parsed.success) throw new Error('invalid grok payload')
		const p = parsed.data
		return {
			source: 'grok',
			sourceRef: p.sourceRef ?? `grok://${p.capturedAt}`,
			text: p.text,
			capturedAt: p.capturedAt
		}
	}
}
