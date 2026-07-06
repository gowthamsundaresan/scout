import { Langfuse } from 'langfuse'

let langfuse: Langfuse | undefined

export type TraceMeta = {
	name: string
	model: string
	input: unknown
}

export type TraceResult<T> = {
	output: T
	usage?: { input?: number; output?: number; total?: number }
}

function client(): Langfuse {
	if (!langfuse) {
		langfuse = new Langfuse({
			publicKey: process.env.LANGFUSE_PUBLIC_KEY,
			secretKey: process.env.LANGFUSE_SECRET_KEY,
			baseUrl: process.env.LANGFUSE_BASEURL
		})
	}
	return langfuse
}

// A parent trace groups multiple generations (graph nodes) under one run; pass its id via `traceId`.
export async function traced<T>(
	meta: TraceMeta & { traceId?: string },
	run: () => Promise<TraceResult<T>>
): Promise<T> {
	if (!process.env.LANGFUSE_PUBLIC_KEY) {
		return (await run()).output
	}
	const parent = meta.traceId
		? client().trace({ id: meta.traceId })
		: client().trace({ name: meta.name })
	const generation = parent.generation({ name: meta.name, model: meta.model, input: meta.input })
	try {
		const { output, usage } = await run()
		generation.end({ output, usage })
		return output
	} catch (err) {
		generation.end({ level: 'ERROR', statusMessage: (err as Error).message })
		throw err
	}
}

export function traceId(name: string): string {
	return `${name}-${globalThis.crypto.randomUUID()}`
}

export async function flushTraces(): Promise<void> {
	if (langfuse) await langfuse.flushAsync()
}
