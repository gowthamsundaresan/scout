import type { AiUpdateRecord, PersonRecord, SelfRecord } from '@scout/memory'

// --- Types & state ---

export const RANK_SYSTEM = `You are Scout's CEO agent doing the ranking pass of a 6-hourly outreach digest.
You are given the user's own profile/theses/asks/offers ("self"), a pool of world items (people,
ai-updates, opportunities — each with a dedupeKey, salience 0..1, and summary), and a list of
dedupeKeys already decided in earlier cycles (do NOT re-surface those).

Select, using ONLY dedupeKeys present in the pool:
- recommend: people genuinely worth reaching out to NOW — tight fit to the user's theses/asks/offers.
- antiRecommend: people that look on-topic but are NOT worth the user's time this cycle — say the anti-signal.
- updates: ai-updates worth putting in front of the user.

Prefer high salience AND tight fit over volume; a short, sharp list beats a long one. Each pick needs a
one-line reason. Return ONLY JSON: { "recommend": [{"dedupeKey","reason"}], "antiRecommend": [...], "updates": [...] }.`

export const COMPOSE_SYSTEM = `You are Scout's CEO agent composing the human-facing digest from an already-ranked
selection. You get the selected people (full records), selected ai-updates, and the user's theses/offers.

For each recommended person write:
- why: why reach out now (specific, grounded in their record).
- message: a concrete 2-3 sentence outreach message the user could send, referencing something real about them.
- pitch: how the user's theses/offers are relevant to them (omit if there is no honest fit).
For each ai-update: a one-line why-it-matters. For each anti-recommendation: a terse why-skip.

Be specific and honest; never invent facts not in the records. Return ONLY JSON matching this shape:
{ "recommend": {"headline", "people": [{"name","handle?","why","message","pitch?"}]},
  "updates": [{"title","why"}], "antiRecommend": {"people": [{"name","why"}]} }.`

export type Selected = {
	recommend: PersonRecord[]
	antiRecommend: PersonRecord[]
	updates: AiUpdateRecord[]
}

// --- Core functions ---

export function rankPrompt(
	self: SelfRecord[],
	world: { dedupeKey: string; type: string; title: string; summary: string; salience: number }[],
	decidedKeys: string[]
): string {
	return [
		section(
			'SELF',
			self.map((s) => `- [${s.type}] ${s.title}: ${s.body}`)
		),
		section(
			'POOL',
			world.map(
				(w) =>
					`- ${w.dedupeKey} [${w.type}, salience ${w.salience.toFixed(2)}] ${w.title} — ${w.summary}`
			)
		),
		section(
			'ALREADY DECIDED (skip)',
			decidedKeys.length ? decidedKeys.map((k) => `- ${k}`) : ['- (none)']
		)
	].join('\n\n')
}

export function composePrompt(self: SelfRecord[], selected: Selected): string {
	const theses = self.filter((s) => s.type === 'thesis' || s.type === 'offer')
	return [
		section(
			'USER THESES/OFFERS',
			theses.map((s) => `- ${s.title}: ${s.body}`)
		),
		section(
			'RECOMMENDED PEOPLE',
			selected.recommend.map((p) => person(p))
		),
		section(
			'AI UPDATES',
			selected.updates.map((u) => `- ${u.title}: ${u.whatHappened} — ${u.whyItMatters}`)
		),
		section(
			'ANTI-RECOMMENDED PEOPLE',
			selected.antiRecommend.map((p) => person(p))
		)
	].join('\n\n')
}

// --- Helper functions ---

function person(p: PersonRecord): string {
	const handle = p.handle ? ` (${p.handle})` : ''
	const role = p.role ? `, ${p.role}` : ''
	return `- ${p.title}${handle}${role}: ${p.whyInteresting} [${p.summary}]`
}

function section(heading: string, lines: string[]): string {
	return `${heading}:\n${lines.length ? lines.join('\n') : '- (none)'}`
}
