import type { AiUpdateRecord, PersonRecord, SelfRecord, SystemNoteRecord } from '@scout/memory'

// --- Types & state ---

export const RANK_SYSTEM = `You are Scout's CEO agent doing the ranking pass of a 6-hourly digest.
You are given the user's own profile/theses/asks/offers ("self"), a pool of world items (people,
ai-updates, opportunities — each with a dedupeKey, salience 0..1, and summary), a list of
dedupeKeys already decided in earlier cycles (do NOT re-surface those), and LESSONS distilled
from evaluations of past digests — apply them when selecting.

Split the pool into four buckets, using ONLY dedupeKeys present in the pool and matching the item's type:
- people.recommend: people worth reaching out to NOW — tight fit to the user's theses/asks/offers.
- people.antiRecommend: people that look on-topic but are NOT worth the user's time — name the anti-signal.
- updates.recommend: ai-updates the user should actually read — material and relevant to their work.
- updates.antiRecommend: ai-updates that look important but are hype/noise/irrelevant to them — say why to skip.

Prefer high salience AND tight fit over volume; a short, sharp list beats a long one. Every pick needs a
one-line reason. People buckets take only person items; update buckets take only ai-update items.
Return ONLY JSON: { "people": {"recommend":[{"dedupeKey","reason"}],"antiRecommend":[...]},
"updates": {"recommend":[...],"antiRecommend":[...]} }.`

export const COMPOSE_SYSTEM = `You are Scout's CEO agent composing the human-facing digest from an already-ranked
selection. You get the user's theses/offers, LESSONS distilled from evaluations of past digests
(apply them when writing), and four buckets (each with full records): recommended people,
anti-recommended people, recommended ai-updates, anti-recommended ai-updates.

Write:
- people.recommend.entries: per person — why (reach out now, grounded in their record), a concrete 2-3 sentence
  outreach message referencing something real about them, and pitch (how the user's theses/offers fit — omit if
  there is no honest fit).
- people.antiRecommend.entries: per person — a terse why-skip.
- updates.recommend.entries: per update — a one-line why-it-matters.
- updates.antiRecommend.entries: per update — a one-line why-skip.
Give each recommend bucket a short headline. Be specific and honest; never invent facts not in the records.
Every entry must include "key": the dedupeKey of the record it came from, copied verbatim from the bucket line.
Return ONLY JSON matching:
{ "people": {"recommend":{"headline","entries":[{"key","name","handle?","why","message","pitch?"}]},
"antiRecommend":{"entries":[{"key","name","why"}]}},
"updates": {"recommend":{"headline","entries":[{"key","title","why"}]},"antiRecommend":{"entries":[{"key","title","why"}]}} }.`

export type Selected = {
	peopleRecommend: PersonRecord[]
	peopleAntiRecommend: PersonRecord[]
	updatesRecommend: AiUpdateRecord[]
	updatesAntiRecommend: AiUpdateRecord[]
}

// --- Core functions ---

export function rankPrompt(
	self: SelfRecord[],
	world: { dedupeKey: string; type: string; title: string; summary: string; salience: number }[],
	decidedKeys: string[],
	lessons: SystemNoteRecord[] = []
): string {
	return [
		section(
			'SELF',
			self.map((s) => `- [${s.type}] ${s.title}: ${s.body}`)
		),
		section(
			'LESSONS (apply these)',
			lessons.map((l) => `- ${l.body}`)
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

export function composePrompt(
	self: SelfRecord[],
	selected: Selected,
	lessons: SystemNoteRecord[] = []
): string {
	const theses = self.filter((s) => s.type === 'thesis' || s.type === 'offer')
	return [
		section(
			'USER THESES/OFFERS',
			theses.map((s) => `- ${s.title}: ${s.body}`)
		),
		section(
			'LESSONS (apply these)',
			lessons.map((l) => `- ${l.body}`)
		),
		section('RECOMMENDED PEOPLE', selected.peopleRecommend.map(person)),
		section('ANTI-RECOMMENDED PEOPLE', selected.peopleAntiRecommend.map(person)),
		section('RECOMMENDED AI UPDATES', selected.updatesRecommend.map(update)),
		section('ANTI-RECOMMENDED AI UPDATES', selected.updatesAntiRecommend.map(update))
	].join('\n\n')
}

// --- Helper functions ---

function person(p: PersonRecord): string {
	const handle = p.handle ? ` (${p.handle})` : ''
	const role = p.role ? `, ${p.role}` : ''
	return `- ${p.dedupeKey} — ${p.title}${handle}${role}: ${p.whyInteresting} [${p.summary}]`
}

function update(u: AiUpdateRecord): string {
	return `- ${u.dedupeKey} — ${u.title}: ${u.whatHappened} — ${u.whyItMatters} [${u.summary}]`
}

function section(heading: string, lines: string[]): string {
	return `${heading}:\n${lines.length ? lines.join('\n') : '- (none)'}`
}
