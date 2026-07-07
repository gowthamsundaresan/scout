import { z } from 'zod'

import { getClient } from './client'
import { traced } from './trace'

// --- Types & state ---

export type CompleteMeta = { name: string; model: string; traceId?: string }

// --- Core functions ---

export async function complete(meta: CompleteMeta, system: string, user: string): Promise<string> {
	return traced(
		{ name: meta.name, model: meta.model, traceId: meta.traceId, input: { user } },
		async () => {
			const res = await getClient().chat.completions.create({
				model: meta.model,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user }
				],
				response_format: { type: 'json_object' }
			})
			return {
				output: res.choices[0]?.message?.content ?? '{}',
				usage: res.usage && {
					input: res.usage.prompt_tokens,
					output: res.usage.completion_tokens,
					total: res.usage.total_tokens
				}
			}
		}
	)
}

export function safeJson<T>(content: string, schema: z.ZodType<T>): T | null {
	let json: unknown
	try {
		json = JSON.parse(content)
	} catch {
		return null
	}
	const parsed = schema.safeParse(json)
	return parsed.success ? parsed.data : null
}
