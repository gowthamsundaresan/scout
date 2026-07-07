import { EVALS_CLIENT_ID } from './constants'
import { loadBootstrapEnv } from './env'

// Idempotent: (re-)registers the evals receiver with the gateway. Run after starting the tunnel.
async function run(): Promise<void> {
	const env = loadBootstrapEnv()
	const res = await fetch(`${env.gatewayUrl.replace(/\/$/, '')}/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-API-Key': env.gatewayAdminSecret },
		body: JSON.stringify({
			clientId: EVALS_CLIENT_ID,
			name: 'evals',
			scope: { receive: true },
			receiveUrl: env.receiveUrl
		})
	})
	if (!res.ok) {
		throw new Error(`gateway /register ${res.status}: ${await res.text()}`)
	}
	console.log(`registered ${EVALS_CLIENT_ID} → ${env.receiveUrl}`)
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
