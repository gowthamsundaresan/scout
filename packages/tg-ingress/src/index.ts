import { loadEnv } from './env'
import { receiveMessage, registerSelf } from './gateway'
import { type TgUpdate, parseReply } from './poll'

const CLIENT_ID = 'tg-ingress'
const POLL_TIMEOUT_S = 50

async function run(): Promise<void> {
	const env = loadEnv()
	const jwt = await registerSelf(env.gatewayUrl, env.gatewayAdminSecret, CLIENT_ID)
	const api = `https://api.telegram.org/bot${env.botToken}`

	// getUpdates and webhooks are mutually exclusive; clear any stale webhook before polling.
	await fetch(`${api}/deleteWebhook`, { method: 'POST' })
	console.log(`tg-ingress polling as ${CLIENT_ID}`)

	let offset = 0
	for (;;) {
		let updates: TgUpdate[]
		try {
			const res = await fetch(`${api}/getUpdates?timeout=${POLL_TIMEOUT_S}&offset=${offset}`)
			if (!res.ok) throw new Error(`getUpdates ${res.status}`)
			updates = ((await res.json()) as { result: TgUpdate[] }).result
		} catch (err) {
			console.error('poll failed, retrying', err)
			await sleep(5000)
			continue
		}

		for (const update of updates) {
			offset = update.update_id + 1
			const body = parseReply(update, env.chatId)
			if (!body) {
				if (update.message?.text) console.log('skipping non-reply message')
				continue
			}
			try {
				const res = await receiveMessage(env.gatewayUrl, jwt, body)
				console.log(
					`forwarded ${body.messageId} → ${res.forwardedTo.join(',') || '(no receivers)'}`
				)
			} catch (err) {
				console.error(`receive failed for ${body.messageId}`, err)
			}
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
