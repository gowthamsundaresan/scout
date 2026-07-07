import { z } from 'zod'

import { complete } from '@scout/llm'
import type { Source, WorldRecord } from '@scout/memory'

import { modelFor } from '../models'

// --- Types & state ---

export type CleanedInput = {
	source: Source
	title: string
	text: string
}

const itemSchema = z.object({
	type: z.enum(['person', 'ai-update', 'opportunity']),
	slug: z.string().min(1),
	title: z.string().min(1),
	summary: z.string().min(1),
	tags: z.array(z.string()),
	salience: z.number().min(0).max(1),
	handle: z.string().optional(),
	role: z.string().optional(),
	whyInteresting: z.string().optional(),
	whatHappened: z.string().optional(),
	whyItMatters: z.string().optional(),
	fit: z.string().optional()
})

const outputSchema = z.object({ items: z.array(itemSchema) })

type Item = z.infer<typeof itemSchema>

const SYSTEM = `You are Scout's processing agent. From a clipped web page, extract the people, AI updates,
and opportunities worth remembering for a networking/outreach digest. Return ONLY a JSON object:
{ "items": [ ... ] }. Each item has:
- type: "person" | "ai-update" | "opportunity"
- slug: short lowercase-kebab stable id for the entity (e.g. a person's name, a product)
- title, summary: concise and specific
- tags: string[] of topical keywords
- salience: 0..1 — how worth surfacing this is
- person → also: whyInteresting (required), handle?, role?
- ai-update → also: whatHappened (required), whyItMatters (required)
- opportunity → also: fit (required, why it fits the user)
Extract 0..N items. Be specific and factual; skip boilerplate. Respond with JSON only.`

// --- Core functions ---

export async function structure(input: CleanedInput): Promise<WorldRecord[]> {
	const user = `Page title: ${input.title}\nURL: ${input.source.url}\n\nContent:\n${input.text}`
	const content = await complete(
		{ name: 'processing-agent', model: modelFor('processing-agent') },
		SYSTEM,
		user
	)
	return parseRecords(content, input.source)
}

// --- Helper functions ---

export function parseRecords(content: string, source: Source): WorldRecord[] {
	let json: unknown
	try {
		json = JSON.parse(content)
	} catch {
		return []
	}
	const parsed = outputSchema.safeParse(json)
	if (!parsed.success) return []
	return parsed.data.items
		.map((item) => toWorldRecord(item, source))
		.filter((record): record is WorldRecord => record !== null)
}

function toWorldRecord(item: Item, source: Source): WorldRecord | null {
	const base = {
		namespace: 'world' as const,
		dedupeKey: `world/${item.type}/${item.slug}`,
		title: item.title,
		summary: item.summary,
		tags: item.tags,
		salience: item.salience,
		source
	}
	switch (item.type) {
		case 'person':
			if (!item.whyInteresting) return null
			return {
				...base,
				type: 'person',
				handle: item.handle,
				role: item.role,
				whyInteresting: item.whyInteresting
			}
		case 'ai-update':
			if (!item.whatHappened || !item.whyItMatters) return null
			return {
				...base,
				type: 'ai-update',
				whatHappened: item.whatHappened,
				whyItMatters: item.whyItMatters
			}
		case 'opportunity':
			if (!item.fit) return null
			return { ...base, type: 'opportunity', fit: item.fit }
	}
}
