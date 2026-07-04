export type IngestResult = {
	ok: boolean
	status?: number
	jobId?: string
	error?: string
}

export async function postIngest(
	apiBase: string,
	token: string,
	source: string,
	payload: unknown
): Promise<IngestResult> {
	try {
		const res = await fetch(`${apiBase}/ingest/${source}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
			body: JSON.stringify(payload)
		})
		const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string }
		return {
			ok: res.ok,
			status: res.status,
			jobId: body.jobId,
			error: res.ok ? undefined : body.error
		}
	} catch (err) {
		return { ok: false, error: (err as Error).message }
	}
}
