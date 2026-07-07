import {
	Client,
	Connection,
	ScheduleAlreadyRunning,
	ScheduleOverlapPolicy
} from '@temporalio/client'
import { pathToFileURL } from 'node:url'

import { CEO_SCHEDULE_ID, CEO_WORKFLOW_ID } from '../constants'
import { loadEnv } from '../env'

// Idempotent: ensures the 6-hourly ceo schedule exists. The worker calls this on boot, so a deploy
// never needs a separate registration step; `npm run schedule` stays as a manual escape hatch.
export async function ensureCeoSchedule(): Promise<void> {
	const env = loadEnv()
	const connection = await Connection.connect({ address: env.temporalAddress })
	try {
		const client = new Client({ connection, namespace: env.temporalNamespace })
		await client.schedule.create({
			scheduleId: CEO_SCHEDULE_ID,
			spec: { intervals: [{ every: '6h' }] },
			action: {
				type: 'startWorkflow',
				workflowType: 'ceoDigestWorkflow',
				taskQueue: env.taskQueue,
				workflowId: CEO_WORKFLOW_ID
			},
			policies: { overlap: ScheduleOverlapPolicy.SKIP }
		})
		console.log(`created schedule ${CEO_SCHEDULE_ID} (every 6h)`)
	} catch (err) {
		if (err instanceof ScheduleAlreadyRunning) return
		throw err
	} finally {
		await connection.close()
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	ensureCeoSchedule().catch((err) => {
		console.error(err)
		process.exit(1)
	})
}
