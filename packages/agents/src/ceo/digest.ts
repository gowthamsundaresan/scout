import { z } from 'zod'

import type { WorldRecord } from '@scout/memory'

import type { Selected } from './prompts'

// --- Types & state ---

// The compose node's contract. Prose (messages, pitches, blurbs) is the LLM's job; turning it into
// channel-ready sections is deterministic (renderDigest), so it stays testable. Four buckets:
// recommend + anti-recommend, for people and for ai-updates — each delivered as its own message.
// key is optional: a required key would let one omitted field blank the whole digest via safeJson.
const personEntry = z.object({
	key: z.string().optional(),
	name: z.string(),
	handle: z.string().optional(),
	why: z.string(),
	message: z.string(),
	pitch: z.string().optional()
})
const skipEntry = z.object({ key: z.string().optional(), name: z.string(), why: z.string() })
const updateEntry = z.object({ key: z.string().optional(), title: z.string(), why: z.string() })

export const composeSchema = z.object({
	people: z.object({
		recommend: z.object({ headline: z.string(), entries: z.array(personEntry) }),
		antiRecommend: z.object({ entries: z.array(skipEntry) })
	}),
	updates: z.object({
		recommend: z.object({ headline: z.string(), entries: z.array(updateEntry) }),
		antiRecommend: z.object({ entries: z.array(updateEntry) })
	})
})

export type ComposeOutput = z.infer<typeof composeSchema>

export type DigestSection = { title: string; body: string }
export type Digest = {
	peopleRecommend: DigestSection
	peopleAntiRecommend: DigestSection
	updatesRecommend: DigestSection
	updatesAntiRecommend: DigestSection
}
export type DigestKey = keyof Digest

// The dashboard's card contract: one entry per item, carried through /send as payload.data.
export type CardEntry = {
	kind: 'person' | 'skip' | 'update'
	key?: string
	name: string
	handle?: string
	url?: string
	why: string
	message?: string
	pitch?: string
}
export type SectionCards = { headline?: string; entries: CardEntry[] }
export type DigestCards = Record<DigestKey, SectionCards>

export const EMPTY_COMPOSE: ComposeOutput = {
	people: { recommend: { headline: '', entries: [] }, antiRecommend: { entries: [] } },
	updates: { recommend: { headline: '', entries: [] }, antiRecommend: { entries: [] } }
}

// --- Core functions ---

export function renderDigest(c: ComposeOutput): Digest {
	return {
		peopleRecommend: renderPeopleRecommend(c),
		peopleAntiRecommend: renderPeopleSkip(c),
		updatesRecommend: renderUpdatesRecommend(c),
		updatesAntiRecommend: renderUpdatesSkip(c)
	}
}

export function buildCards(c: ComposeOutput, selected: Selected): DigestCards {
	return {
		peopleRecommend: {
			headline: c.people.recommend.headline || undefined,
			entries: c.people.recommend.entries.map((p) =>
				enrich(
					{
						kind: 'person',
						key: p.key,
						name: p.name,
						handle: p.handle,
						why: p.why,
						message: p.message,
						pitch: p.pitch
					},
					selected.peopleRecommend
				)
			)
		},
		peopleAntiRecommend: {
			entries: c.people.antiRecommend.entries.map((p) =>
				enrich({ kind: 'skip', key: p.key, name: p.name, why: p.why }, selected.peopleAntiRecommend)
			)
		},
		updatesRecommend: {
			headline: c.updates.recommend.headline || undefined,
			entries: c.updates.recommend.entries.map((u) =>
				enrich({ kind: 'update', key: u.key, name: u.title, why: u.why }, selected.updatesRecommend)
			)
		},
		updatesAntiRecommend: {
			entries: c.updates.antiRecommend.entries.map((u) =>
				enrich(
					{ kind: 'update', key: u.key, name: u.title, why: u.why },
					selected.updatesAntiRecommend
				)
			)
		}
	}
}

export function pingSummary(cards: DigestCards): string {
	const people = cards.peopleRecommend.entries.length
	const updates = cards.updatesRecommend.entries.length
	return `${people} people · ${updates} updates`
}

export function isEmpty(d: Digest): Record<DigestKey, boolean> {
	return {
		peopleRecommend: !d.peopleRecommend.body.trim(),
		peopleAntiRecommend: !d.peopleAntiRecommend.body.trim(),
		updatesRecommend: !d.updatesRecommend.body.trim(),
		updatesAntiRecommend: !d.updatesAntiRecommend.body.trim()
	}
}

// --- Helper functions ---

// Resolve an entry back to its world record: by echoed key, else by name. A key that resolves to
// nothing is dropped — a hallucinated key must never reach the UI as a reply target.
function enrich(entry: CardEntry, records: WorldRecord[]): CardEntry {
	const record =
		records.find((r) => r.dedupeKey === entry.key) ??
		records.find((r) => r.title.toLowerCase() === entry.name.toLowerCase())
	if (!record) return { ...entry, key: undefined }
	return {
		...entry,
		key: record.dedupeKey,
		url: record.source.url || undefined,
		handle: entry.handle ?? (record.type === 'person' ? record.handle : undefined)
	}
}

function renderPeopleRecommend(c: ComposeOutput): DigestSection {
	const entries = c.people.recommend.entries.map((p) => {
		const who = p.handle ? `**${p.name}** (${p.handle})` : `**${p.name}**`
		const lines = [`• ${who} — ${p.why}`, `  ↳ Message: ${p.message}`]
		if (p.pitch) lines.push(`  ↳ Pitch: ${p.pitch}`)
		return lines.join('\n')
	})
	const body = entries.length
		? [c.people.recommend.headline, entries.join('\n\n')].join('\n\n')
		: ''
	return { title: 'Scout — people to reach out to', body }
}

function renderPeopleSkip(c: ComposeOutput): DigestSection {
	const entries = c.people.antiRecommend.entries.map((p) => `• **${p.name}** — ${p.why}`)
	const body = entries.length ? ['People to skip this cycle:', entries.join('\n')].join('\n\n') : ''
	return { title: 'Scout — people to skip', body }
}

function renderUpdatesRecommend(c: ComposeOutput): DigestSection {
	const entries = c.updates.recommend.entries.map((u) => `• **${u.title}** — ${u.why}`)
	const body = entries.length ? [c.updates.recommend.headline, entries.join('\n')].join('\n\n') : ''
	return { title: 'Scout — AI updates worth your attention', body }
}

function renderUpdatesSkip(c: ComposeOutput): DigestSection {
	const entries = c.updates.antiRecommend.entries.map((u) => `• **${u.title}** — ${u.why}`)
	const body = entries.length ? ['AI noise to skip:', entries.join('\n')].join('\n\n') : ''
	return { title: 'Scout — AI noise to skip', body }
}
