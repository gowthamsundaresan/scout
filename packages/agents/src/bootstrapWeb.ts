import { WEB_CLIENT_ID } from './constants'
import { loadEnv } from './env'
import { registerClient } from './gateway/client'

// Separate from bootstrap on purpose: every register bumps tokenVersion, rotating the JWT the
// dashboard holds in Vercel env — run this only when you mean to mint a new one.
async function run(): Promise<void> {
	const env = loadEnv()
	const admin = { baseUrl: env.gatewayUrl, adminSecret: env.gatewayAdminSecret }

	const reg = await registerClient(admin, {
		clientId: WEB_CLIENT_ID,
		name: 'web',
		scope: { send: true, read: true }
	})

	console.log(`web client "${reg.clientId}" registered — set GATEWAY_JWT in Vercel to:\n${reg.jwt}`)
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
