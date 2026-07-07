// Wire mirrors — this package is deliberately self-contained (workspace packages export raw TS and
// drag mongoose/supermemory into the Vercel build). Sources of truth:
// - CardEntry/SectionCards: scout/packages/agents/src/ceo/digest.ts
// - GatewayMessage: scout-gateway messagesController.ts (toApiMessage)
// - IngestJob/SearchSeed: scout/packages/indexer/src/db/models
// - DecisionRecord/LessonRecord/MemoryRecord: scout/packages/memory/src/types.ts

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

export type GatewayMessage = {
	messageId: string
	fromClientId: string
	direction: 'out' | 'in'
	intent?: number
	templateId?: string
	payload: {
		vars?: Record<string, string>
		rendered?: { title: string; body: string }
		data?: SectionCards
		text?: string
		[key: string]: unknown
	}
	receiverIds: string[]
	replyToMessageId?: string
	status: string
	createdAt: string
}

export type Thread = { message: GatewayMessage; replies: GatewayMessage[] }

export type IngestJob = {
	_id: string
	source: string
	status: 'queued' | 'processing' | 'done' | 'failed'
	attempts: number
	written: string[]
	error?: string
	createdAt: string
	updatedAt: string
}

export type SearchSeed = {
	kind: string
	key: string
	query: string
	origin?: string
	websetId?: string
	lastSearchAt?: string
	exhausted: boolean
	totalSeen: number
	dormant: boolean
	updatedAt: string
}

export type DecisionRecord = {
	dedupeKey: string
	title: string
	body: string
	targetKey: string
	targetType: string
	intent: number
	verdict: string
	decidedAt: string
}

export type LessonRecord = {
	dedupeKey: string
	title: string
	body: string
	payload?: Record<string, unknown>
}

export type MemoryRecord = {
	namespace: string
	type: string
	dedupeKey: string
	title: string
	summary?: string
	body?: string
	salience?: number
	[key: string]: unknown
}
