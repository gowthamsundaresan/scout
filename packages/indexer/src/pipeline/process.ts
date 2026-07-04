import { write } from '@scout/memory'
import type { Source } from '@scout/memory'

import { structure } from '../processing/agent'
import type { RawItem } from '../sources/types'
import { retry } from '../util/retry'
import { clean } from './clean'

export async function processItem(item: RawItem): Promise<string[]> {
	const cleaned = clean({
		html: item.html,
		text: item.text,
		url: item.sourceRef,
		title: item.title
	})
	if (!cleaned.text) return []

	const source: Source = { name: item.source, url: item.sourceRef, fetchedAt: item.capturedAt }
	const records = await retry(() => structure({ source, title: cleaned.title, text: cleaned.text }))

	const written: string[] = []
	for (const record of records) {
		await retry(() => write(record))
		written.push(record.dedupeKey)
	}
	return written
}
