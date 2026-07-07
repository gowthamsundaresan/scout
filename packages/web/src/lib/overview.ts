import { type DigestRun, cardsOf, groupSections } from './digest'
import type { DecisionRecord, GatewayMessage, SearchSeed } from './types'

// --- Types & state ---

const CADENCE_HOURS = 6

export type LoopStatus = {
	lastRunAt: string | null
	sectionsSent: number
	pingDelivered: boolean
	hoursSince: number | null
	overdue: boolean
}

// null count = section missing or pre-cards format; render as "—", never as 0
export type DigestSnapshot = {
	reachOut: number | null
	skip: number | null
	updates: number | null
	noise: number | null
	names: string[]
	structured: boolean
}

// --- Core functions ---

export function loopStatus(
	runs: DigestRun[],
	messages: GatewayMessage[],
	nowMs: number
): LoopStatus {
	const latest = runs[0]
	if (!latest) {
		return {
			lastRunAt: null,
			sectionsSent: 0,
			pingDelivered: false,
			hoursSince: null,
			overdue: false
		}
	}
	const ping = messages.find((m) => m.messageId === `${latest.runId}-ping`)
	const hoursSince = (nowMs - new Date(latest.createdAt).getTime()) / 3_600_000
	return {
		lastRunAt: latest.createdAt,
		sectionsSent: latest.sections.length,
		pingDelivered: ping?.status === 'delivered',
		hoursSince,
		overdue: hoursSince > CADENCE_HOURS + 0.5
	}
}

export function digestSnapshot(run: DigestRun | undefined): DigestSnapshot | null {
	if (!run) return null
	const grouped = groupSections(run)
	const count = (m?: GatewayMessage) => (m ? (cardsOf(m)?.entries.length ?? null) : null)
	const reachOut = count(grouped.people.recommend)
	const skip = count(grouped.people.anti)
	const updates = count(grouped.ai.recommend)
	const noise = count(grouped.ai.anti)
	const structured = [reachOut, skip, updates, noise].some((n) => n !== null)
	const names = grouped.people.recommend
		? (cardsOf(grouped.people.recommend)
				?.entries.slice(0, 3)
				.map((e) => e.name) ?? [])
		: []
	return { reachOut, skip, updates, noise, names, structured }
}

export function decisionTally(decisions: DecisionRecord[]): {
	accepted: number
	rejected: number
	other: number
} {
	let accepted = 0
	let rejected = 0
	let other = 0
	for (const d of decisions) {
		if (d.verdict === 'accepted') accepted++
		else if (d.verdict === 'rejected') rejected++
		else other++
	}
	return { accepted, rejected, other }
}

export function seedTally(seeds: SearchSeed[]): {
	active: number
	exhausted: number
	dormant: number
} {
	let active = 0
	let exhausted = 0
	let dormant = 0
	for (const s of seeds) {
		if (s.dormant) dormant++
		else if (s.exhausted) exhausted++
		else active++
	}
	return { active, exhausted, dormant }
}
