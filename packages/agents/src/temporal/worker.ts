import { NativeConnection, Worker } from '@temporalio/worker'
import { fileURLToPath } from 'node:url'

import { loadEnv } from '../env'
import * as activities from './activities'

async function run(): Promise<void> {
	const env = loadEnv()
	const connection = await NativeConnection.connect({ address: env.temporalAddress })
	const worker = await Worker.create({
		connection,
		namespace: env.temporalNamespace,
		taskQueue: env.taskQueue,
		workflowsPath: fileURLToPath(new URL('./workflows.ts', import.meta.url)),
		activities
	})
	await worker.run()
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
