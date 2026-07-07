import { clipper } from './clipper'
import { exa } from './exa'
import { exaSearch } from './exaSearch'
import { grok } from './grok'
import type { SourceAdapter } from './types'

// Websets needs a paid exa plan; plain /search is the default until then.
const exaAdapter = process.env.EXA_SOURCE === 'websets' ? exa : exaSearch

const sources = new Map<string, SourceAdapter>([
	[clipper.name, clipper],
	[exaAdapter.name, exaAdapter],
	[grok.name, grok]
])

export function getSource(name: string): SourceAdapter | undefined {
	return sources.get(name)
}

export function listSources(): SourceAdapter[] {
	return [...sources.values()]
}
