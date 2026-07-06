import { proxyActivities, workflowInfo } from '@temporalio/workflow'

import type * as activities from './activities'

const { readContext, composeDigest, sendDigest } = proxyActivities<typeof activities>({
	startToCloseTimeout: '5 minutes',
	retry: { maximumAttempts: 3 }
})

// The 6-hourly digest. Temporal owns the durable lifecycle; the LangGraph reasoning lives in composeDigest.
export async function ceoDigestWorkflow(): Promise<{ sent: number }> {
	const ctx = await readContext()
	const { digest } = await composeDigest(ctx)
	const sent = await sendDigest(workflowInfo().runId, digest)
	return { sent: sent.length }
}
