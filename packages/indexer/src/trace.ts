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

export async function traced<T>(meta: TraceMeta, run: () => Promise<TraceResult<T>>): Promise<T> {
	if (!process.env.LANGFUSE_PUBLIC_KEY) {
		return (await run()).output
	}
	const generation = client()
		.trace({ name: meta.name })
		.generation({ name: meta.name, model: meta.model, input: meta.input })
	try {
		const { output, usage } = await run()
		generation.end({ output, usage })
		return output
	} catch (err) {
		generation.end({ level: 'ERROR', statusMessage: (err as Error).message })
		throw err
	}
}

export async function flushTraces(): Promise<void> {
	if (langfuse) await langfuse.flushAsync()
}
