import {
	CEO_CLIENT_ID,
	TEMPLATE_AI_ANTIRECOMMEND,
	TEMPLATE_AI_RECOMMEND,
	TEMPLATE_DIGEST_PING,
	TEMPLATE_PEOPLE_ANTIRECOMMEND,
	TEMPLATE_PEOPLE_RECOMMEND
} from './constants'
import { loadEnv } from './env'
import { type TemplateBody, registerClient, upsertTemplate } from './gateway/client'

// One-time setup against the gateway admin plane: the digest templates + the ceo send client.
// Templates are pass-through ({title}/{body}) — the ceo composes the prose, the gateway stays dumb.
// The four sections are web (the dashboard is the digest); tg carries only the one-line ping.
async function run(): Promise<void> {
	const env = loadEnv()
	const admin = { baseUrl: env.gatewayUrl, adminSecret: env.gatewayAdminSecret }

	const templates: { templateId: string; name: string }[] = [
		{ templateId: TEMPLATE_PEOPLE_RECOMMEND, name: 'Digest — people to reach out to' },
		{ templateId: TEMPLATE_PEOPLE_ANTIRECOMMEND, name: 'Digest — people to skip' },
		{ templateId: TEMPLATE_AI_RECOMMEND, name: 'Digest — AI updates' },
		{ templateId: TEMPLATE_AI_ANTIRECOMMEND, name: 'Digest — AI noise to skip' }
	]
	for (const t of templates) {
		const body: TemplateBody = { ...t, channel: 'web', title: '{title}', body: '{body}' }
		await upsertTemplate(admin, body)
	}

	await upsertTemplate(admin, {
		templateId: TEMPLATE_DIGEST_PING,
		name: 'Digest — ping',
		channel: 'tg',
		title: '',
		body: 'New digest · {summary} → {url}'
	})

	const reg = await registerClient(admin, {
		clientId: CEO_CLIENT_ID,
		name: 'ceo',
		scope: { send: true }
	})

	console.log(
		`bootstrapped: ceo client "${reg.clientId}", ${templates.length} web templates + tg ping`
	)
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
