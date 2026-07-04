import { z } from 'zod'

import type { RawItem, SourceAdapter } from './types'

export const clipPayloadSchema = z
	.object({
		url: z.string().url(),
		title: z.string().optional(),
		html: z.string().optional(),
		selection: z.string().optional(),
		capturedAt: z.string().min(1)
	})
	.refine((p) => Boolean(p.html) || Boolean(p.selection), {
		message: 'html or selection is required'
	})

export type ClipPayload = z.infer<typeof clipPayloadSchema>

export const clipper: SourceAdapter = {
	name: 'clipper',
	mode: 'push',
	toRawItem(payload: unknown): RawItem {
		const parsed = clipPayloadSchema.safeParse(payload)
		if (!parsed.success) throw new Error('invalid clipper payload')
		const p = parsed.data
		return {
			source: 'clipper',
			sourceRef: p.url,
			title: p.title,
			html: p.selection ? undefined : p.html,
			text: p.selection,
			capturedAt: p.capturedAt
		}
	}
}
