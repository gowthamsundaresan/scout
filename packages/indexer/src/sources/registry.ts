import { clipper } from './clipper'
import { exa } from './exa'
import { grok } from './grok'
import type { SourceAdapter } from './types'

const sources = new Map<string, SourceAdapter>([
	[clipper.name, clipper],
	[exa.name, exa],
	[grok.name, grok]
])

export function getSource(name: string): SourceAdapter | undefined {
	return sources.get(name)
}

export function listSources(): SourceAdapter[] {
	return [...sources.values()]
}
