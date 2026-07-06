import { resolveModel } from '@scout/llm'

export type CeoModelKey = 'ceo-rank' | 'ceo-compose'

const DEFAULTS: Record<CeoModelKey, string> = {
	'ceo-rank': 'anthropic/claude-sonnet-4.6',
	'ceo-compose': 'anthropic/claude-opus-4.8'
}

export function modelFor(key: CeoModelKey): string {
	return resolveModel(key, DEFAULTS[key])
}
