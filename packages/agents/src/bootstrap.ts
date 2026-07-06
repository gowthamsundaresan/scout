import { CEO_CLIENT_ID, TEMPLATE_ANTIRECOMMEND, TEMPLATE_RECOMMEND } from './constants'
import { loadEnv } from './env'
import { registerClient, upsertTemplate } from './gateway/client'

// One-time setup against the gateway admin plane: the two digest templates + the ceo send client.
// Templates are pass-through ({title}/{body}) — the ceo composes the prose, the gateway stays dumb.
async function run(): Promise<void> {
	const env = loadEnv()
	const admin = { baseUrl: env.gatewayUrl, adminSecret: env.gatewayAdminSecret }
	const channel = env.digestChannel

	await upsertTemplate(admin, {
		templateId: TEMPLATE_RECOMMEND,
		name: 'Digest — recommend',
		channel,
		title: '{title}',
		body: '{body}'
	})
	await upsertTemplate(admin, {
		templateId: TEMPLATE_ANTIRECOMMEND,
		name: 'Digest — anti-recommend',
		channel,
		title: '{title}',
		body: '{body}'
	})
	const reg = await registerClient(admin, {
		clientId: CEO_CLIENT_ID,
		name: 'ceo',
		scope: { send: true }
	})

	console.log(`bootstrapped: ceo client "${reg.clientId}", templates for channel=${channel}`)
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
