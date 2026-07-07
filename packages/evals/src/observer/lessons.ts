import type { SystemNoteRecord } from '@scout/memory'

// dedupeKey derives from the lesson text: identical suggestions upsert (dedup-on-write),
// distinct ones coexist and are ranked at read time by rerank retrieval.
export function lessonRecord(theme: string, body: string, evidenceKey: string): SystemNoteRecord {
	return {
		namespace: 'system',
		type: 'lesson',
		dedupeKey: `system/lesson/${theme}/${slug(body)}`,
		title: `lesson: ${theme}`,
		body,
		payload: { evidence: evidenceKey }
	}
}

function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
}
