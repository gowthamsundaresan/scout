export type Namespace = 'self' | 'world' | 'system'

export type Source = {
	name: string
	url: string
	fetchedAt: string
}

export type SelfRecord = {
	namespace: 'self'
	type: 'profile' | 'thesis' | 'ask' | 'offer'
	dedupeKey: string
	title: string
	body: string
	tags?: string[]
}

type WorldBase = {
	namespace: 'world'
	dedupeKey: string
	title: string
	summary: string
	tags: string[]
	salience: number
	source: Source
}

export type PersonRecord = WorldBase & {
	type: 'person'
	handle?: string
	role?: string
	whyInteresting: string
}

export type AiUpdateRecord = WorldBase & {
	type: 'ai-update'
	whatHappened: string
	whyItMatters: string
}

export type OpportunityRecord = WorldBase & {
	type: 'opportunity'
	fit: string
}

export type WorldRecord = PersonRecord | AiUpdateRecord | OpportunityRecord

export type Intent = 0 | 1

export type Verdict = 'surfaced' | 'accepted' | 'rejected' | 'self-rejected'

export type TargetType = 'person' | 'ai-update' | 'opportunity'

export type SystemNoteRecord = {
	namespace: 'system'
	type: 'lesson' | 'skill' | 'guide' | 'checkpoint'
	dedupeKey: string
	title: string
	body: string
	payload?: Record<string, string | number | boolean>
}

export type DecisionRecord = {
	namespace: 'system'
	type: 'decision'
	dedupeKey: string
	title: string
	body: string
	targetKey: string
	targetType: TargetType
	intent: Intent
	verdict: Verdict
	decidedAt: string
}

export type SystemRecord = SystemNoteRecord | DecisionRecord

export type MemoryRecord = SelfRecord | WorldRecord | SystemRecord

export type Metadata = Record<string, string | number | boolean>

// The digest ledger: what the ceo actually sent, per section, keyed for reply/eval joins.
export type LedgerTarget = {
	dedupeKey: string
	name: string
	type: TargetType
	facts?: string
}

export type LedgerSection = {
	messageId: string
	slug: string
	intent: Intent
	title: string
	body: string
	targets: LedgerTarget[]
}

export type DigestLedger = {
	runId: string
	sections: LedgerSection[]
}
