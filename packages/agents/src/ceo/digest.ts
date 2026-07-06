import { z } from 'zod'

// --- Types & state ---

// The compose node's contract. Prose (messages, pitches, blurbs) is the LLM's job; turning it into
// the two channel-ready sections is deterministic (renderDigest), so it stays testable.
export const composeSchema = z.object({
	recommend: z.object({
		headline: z.string(),
		people: z.array(
			z.object({
				name: z.string(),
				handle: z.string().optional(),
				why: z.string(),
				message: z.string(),
				pitch: z.string().optional()
			})
		)
	}),
	updates: z.array(z.object({ title: z.string(), why: z.string() })),
	antiRecommend: z.object({
		people: z.array(z.object({ name: z.string(), why: z.string() }))
	})
})

export type ComposeOutput = z.infer<typeof composeSchema>

export type DigestSection = { title: string; body: string }
export type Digest = { recommend: DigestSection; antiRecommend: DigestSection }

// --- Core functions ---

export function renderDigest(c: ComposeOutput): Digest {
	return { recommend: renderRecommend(c), antiRecommend: renderAntiRecommend(c) }
}

export function isEmpty(d: Digest): { recommend: boolean; antiRecommend: boolean } {
	return {
		recommend: !d.recommend.body.trim(),
		antiRecommend: !d.antiRecommend.body.trim()
	}
}

// --- Helper functions ---

function renderRecommend(c: ComposeOutput): DigestSection {
	const blocks: string[] = []
	if (c.recommend.people.length) {
		const people = c.recommend.people.map((p) => {
			const who = p.handle ? `**${p.name}** (${p.handle})` : `**${p.name}**`
			const lines = [`• ${who} — ${p.why}`, `  ↳ Message: ${p.message}`]
			if (p.pitch) lines.push(`  ↳ Pitch: ${p.pitch}`)
			return lines.join('\n')
		})
		blocks.push(['*People to reach out to*', ...people].join('\n\n'))
	}
	if (c.updates.length) {
		const updates = c.updates.map((u) => `• **${u.title}** — ${u.why}`)
		blocks.push(['*AI updates*', updates.join('\n')].join('\n\n'))
	}
	const body = blocks.length ? [c.recommend.headline, ...blocks].join('\n\n') : ''
	return { title: 'Scout digest — who to reach & what shipped', body }
}

function renderAntiRecommend(c: ComposeOutput): DigestSection {
	const people = c.antiRecommend.people
	const body = people.length
		? [
				'People to skip this cycle:',
				people.map((p) => `• **${p.name}** — ${p.why}`).join('\n')
			].join('\n\n')
		: ''
	return { title: 'Scout digest — skip these', body }
}
