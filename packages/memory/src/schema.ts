import { z } from 'zod'

const selfSchema = z.object({
	namespace: z.literal('self'),
	type: z.enum(['profile', 'thesis', 'ask', 'offer']),
	dedupeKey: z.string().min(1),
	title: z.string().min(1),
	body: z.string().min(1),
	tags: z.array(z.string()).optional()
})

const worldBase = {
	namespace: z.literal('world'),
	dedupeKey: z.string().min(1),
	title: z.string().min(1),
	summary: z.string().min(1),
	tags: z.array(z.string()),
	salience: z.number().min(0).max(1),
	source: z.object({ name: z.string().min(1), url: z.string().url(), fetchedAt: z.string().min(1) })
}

const worldSchema = z.discriminatedUnion('type', [
	z.object({
		...worldBase,
		type: z.literal('person'),
		handle: z.string().optional(),
		role: z.string().optional(),
		whyInteresting: z.string().min(1)
	}),
	z.object({
		...worldBase,
		type: z.literal('ai-update'),
		whatHappened: z.string().min(1),
		whyItMatters: z.string().min(1)
	}),
	z.object({ ...worldBase, type: z.literal('opportunity'), fit: z.string().min(1) })
])

const systemNoteSchema = z.object({
	namespace: z.literal('system'),
	type: z.enum(['lesson', 'skill', 'guide', 'checkpoint']),
	dedupeKey: z.string().min(1),
	title: z.string().min(1),
	body: z.string().min(1),
	payload: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
})

const decisionSchema = z.object({
	namespace: z.literal('system'),
	type: z.literal('decision'),
	dedupeKey: z.string().min(1),
	title: z.string().min(1),
	body: z.string().min(1),
	targetKey: z.string().min(1),
	targetType: z.enum(['person', 'ai-update', 'opportunity']),
	intent: z.union([z.literal(0), z.literal(1)]),
	verdict: z.enum(['surfaced', 'accepted', 'rejected', 'self-rejected']),
	decidedAt: z.string().min(1)
})

const systemSchema = z.union([systemNoteSchema, decisionSchema])

export const memoryRecordSchema = z.union([selfSchema, worldSchema, systemSchema])
