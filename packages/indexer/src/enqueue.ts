import { enqueue } from './jobs/queue'
import { getSource } from './sources/registry'

export async function enqueueClip(payload: unknown): Promise<string> {
	return enqueueFor('clipper', payload)
}

export async function enqueueFor(sourceName: string, payload: unknown): Promise<string> {
	const source = getSource(sourceName)
	if (!source?.toRawItem) throw new Error(`push source not registered: ${sourceName}`)
	return enqueue(sourceName, source.toRawItem(payload))
}
