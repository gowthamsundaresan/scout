import { resolveModel } from '@scout/llm'

export type EvalsModelKey = 'evals-digest-judge' | 'evals-feedback-judge'

const DEFAULTS: Record<EvalsModelKey, string> = {
	'evals-digest-judge': 'anthropic/claude-sonnet-4.6',
	'evals-feedback-judge': 'anthropic/claude-sonnet-4.6'
}

export function modelFor(key: EvalsModelKey): string {
	return resolveModel(key, DEFAULTS[key])
}
