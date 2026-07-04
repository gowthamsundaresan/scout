import type { MemoryRecord } from '@scout/memory'

import { getClient } from '../llm/client'
import { modelFor } from '../llm/models'
import { traced } from '../trace'

const SYSTEM = `You write ONE Exa Websets search query to discover INTERESTING PEOPLE connected to a
given context — a thesis the user holds, or an event / opportunity / AI update. Target the organizers,
speakers, founders, builders, researchers, and community runners around it. Return ONLY the query
string: one line, no quotes, no preamble.`

export async function exaQuery(record: MemoryRecord): Promise<string> {
	const model = modelFor('exa-query')
	const user = describe(record)

	return traced({ name: 'exa-query', model, input: { key: record.dedupeKey } }, async () => {
		const res = await getClient().chat.completions.create({
			model,
			messages: [
				{ role: 'system', content: SYSTEM },
				{ role: 'user', content: user }
			]
		})
		return {
			output: (res.choices[0]?.message?.content ?? '').trim(),
			usage: res.usage && {
				input: res.usage.prompt_tokens,
				output: res.usage.completion_tokens,
				total: res.usage.total_tokens
			}
		}
	})
}

// --- Helper functions ---

function describe(record: MemoryRecord): string {
	if (record.namespace === 'self') return `${record.title}\n${record.body}`
	if (record.namespace === 'world') {
		const parts = [record.title, record.summary]
		if (record.type === 'ai-update') parts.push(record.whatHappened, record.whyItMatters)
		if (record.type === 'opportunity') parts.push(record.fit)
		return parts.filter(Boolean).join('\n')
	}
	return record.title
}
