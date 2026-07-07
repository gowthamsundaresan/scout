import { resolveModel } from '@scout/llm'

export type ModelKey = 'processing-agent' | 'exa-query'

const DEFAULTS: Record<ModelKey, string> = {
	'processing-agent': 'anthropic/claude-sonnet-4.6',
	'exa-query': 'anthropic/claude-haiku-4.5'
}

export function modelFor(key: ModelKey): string {
	return resolveModel(key, DEFAULTS[key])
}
