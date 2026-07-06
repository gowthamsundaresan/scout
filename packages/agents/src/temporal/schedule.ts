import { Client, Connection, ScheduleOverlapPolicy } from '@temporalio/client'

import { CEO_SCHEDULE_ID, CEO_WORKFLOW_ID } from '../constants'
import { loadEnv } from '../env'

// Idempotent: ensures the 6-hourly ceo schedule exists. Safe to re-run on every deploy.
async function run(): Promise<void> {
	const env = loadEnv()
	const connection = await Connection.connect({ address: env.temporalAddress })
	const client = new Client({ connection, namespace: env.temporalNamespace })

	try {
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
		if ((err as { name?: string }).name === 'ScheduleAlreadyRunning') {
			console.log(`schedule ${CEO_SCHEDULE_ID} already exists`)
			return
		}
		throw err
	}
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
