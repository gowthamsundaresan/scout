import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'

import { loadEnv } from '../env'
import { verifySignature } from './verify'

// The gateway forward is fire-and-forget (no retry), so this must answer fast and stay idempotent:
// the workflowId is the forwarded messageId, so a re-delivered forward is a no-op.
async function run(): Promise<void> {
	const env = loadEnv()
	if (!env.forwardSecret) throw new Error('Missing required env: FORWARD_SECRET')
	const secret = env.forwardSecret

	const connection = await Connection.connect({ address: env.temporalAddress })
	const client = new Client({ connection, namespace: env.temporalNamespace })

	const server = createServer((req, res) => {
		if (req.method !== 'POST' || req.url !== '/receive') {
			res.statusCode = 404
			return res.end()
		}
		void handle(req, res, client, env.taskQueue, secret)
	})

	server.listen(env.port, () => console.log(`evals receiver listening on :${env.port}`))
}

async function handle(
	req: IncomingMessage,
	res: ServerResponse,
	client: Client,
	taskQueue: string,
	secret: string
): Promise<void> {
	const chunks: Buffer[] = []
	for await (const chunk of req) chunks.push(chunk as Buffer)
	const raw = Buffer.concat(chunks).toString('utf8')

	if (!verifySignature(raw, req.headers['x-scout-signature'] as string | undefined, secret)) {
		return end(res, 401)
	}

	let forward: { messageId?: string; replyToMessageId?: string }
	try {
		forward = JSON.parse(raw)
	} catch {
		return end(res, 400)
	}
	if (!forward.messageId || !forward.replyToMessageId) {
		return end(res, 400)
	}

	try {
		await client.workflow.start('evalReplyWorkflow', {
			taskQueue,
			workflowId: forward.messageId,
			args: [forward]
		})
	} catch (err) {
		if (!(err instanceof WorkflowExecutionAlreadyStartedError)) {
			console.error('failed to start evalReplyWorkflow', err)
			return end(res, 500)
		}
	}
	end(res, 202)
}

function end(res: ServerResponse, statusCode: number): void {
	res.statusCode = statusCode
	res.end()
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
