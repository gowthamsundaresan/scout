export type RawItem = {
	source: string
	sourceRef: string
	title?: string
	html?: string
	text?: string
	capturedAt: string
}

export type SourceAdapter = {
	name: string
	mode: 'push' | 'pull'
	toRawItem?: (payload: unknown) => RawItem
	fetch?: (since: string | undefined) => Promise<{ items: RawItem[]; cursor: string }>
}
