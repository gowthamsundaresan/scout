import { memoryRecordSchema } from './schema'
import type { MemoryRecord, Metadata } from './types'

// --- Types & state ---

export type Derived = {
	containerTag: string
	customId: string
	content: string
	metadata: Metadata
}

// --- Core functions ---

export function render(record: MemoryRecord): Derived {
	const metadata: Metadata = { type: record.type, record: JSON.stringify(record) }
	if ('salience' in record) metadata.salience = record.salience
	if (record.namespace === 'system' && record.type === 'decision') {
		metadata.verdict = record.verdict
		metadata.intent = record.intent
		metadata.targetType = record.targetType
		metadata.targetKey = record.targetKey
	}

	return {
		containerTag: record.namespace,
		customId: slugId(record.dedupeKey),
		content: toContent(record),
		metadata
	}
}

export function rehydrate(metadata: unknown): MemoryRecord | null {
	if (!metadata || typeof metadata !== 'object') return null
	const raw = (metadata as Record<string, unknown>).record
	if (typeof raw !== 'string') return null
	try {
		const parsed = memoryRecordSchema.safeParse(JSON.parse(raw))
		return parsed.success ? parsed.data : null
	} catch {
		return null
	}
}

// --- Helper functions ---

function slugId(key: string): string {
	return key
		.replace(/[^A-Za-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100)
}

function toContent(record: MemoryRecord): string {
	switch (record.namespace) {
		case 'self':
			return `${record.title}\n\n${record.body}`
		case 'system':
			// Checkpoint bodies are machine JSON, rehydrated from metadata — keep them out of content
			// so supermemory doesn't embed/summarize them. Nothing searches checkpoints semantically.
			return record.type === 'checkpoint' ? record.title : `${record.title}\n\n${record.body}`
		case 'world':
			return [record.title, record.summary, detail(record), `source: ${record.source.url}`]
				.filter(Boolean)
				.join('\n')
	}
}

function detail(record: Extract<MemoryRecord, { namespace: 'world' }>): string {
	switch (record.type) {
		case 'person':
			return [record.role, record.whyInteresting].filter(Boolean).join(' — ')
		case 'ai-update':
			return `${record.whatHappened}\n${record.whyItMatters}`
		case 'opportunity':
			return record.fit
	}
}
