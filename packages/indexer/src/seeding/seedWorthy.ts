import type { MemoryRecord } from '@scout/memory'

import type { SeedKind } from '../db/models/searchSeed'

// People are discovery's output, never a seed — excluding them also stops the loop feeding on itself.
export function seedWorthy(record: MemoryRecord, threshold: number): boolean {
	if (record.namespace === 'self') {
		return record.type === 'thesis' || record.type === 'ask' || record.type === 'offer'
	}
	if (record.namespace === 'world') {
		return record.type !== 'person' && record.salience >= threshold
	}
	return false
}

export function seedKey(record: MemoryRecord): string {
	return record.namespace === 'self' ? `self:${record.dedupeKey}` : record.dedupeKey
}

export function seedKind(record: MemoryRecord): SeedKind {
	return record.type as SeedKind
}
