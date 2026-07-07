import { DIGEST_SLUGS, type DigestLedger, checkpointToLedger, getSystem } from '@scout/memory'

// --- Core functions ---

// messageId = `${runId}-${slug}`; the runId itself contains hyphens, so match on the known slug suffix.
export function parseRunId(messageId: string): string | null {
	for (const slug of DIGEST_SLUGS) {
		const suffix = `-${slug}`
		if (messageId.endsWith(suffix)) return messageId.slice(0, -suffix.length)
	}
	return null
}

export async function loadLedger(messageId: string): Promise<DigestLedger | null> {
	const runId = parseRunId(messageId)
	if (!runId) return null
	const record = await getSystem(`system/digest/${runId}`, 'checkpoint')
	return record ? checkpointToLedger(record) : null
}
