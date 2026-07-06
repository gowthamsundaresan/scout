import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CEO_TASK_QUEUE } from './constants'

// --- Types & state ---

export type AgentsEnv = {
	gatewayUrl: string
	gatewayAdminSecret: string
	temporalAddress: string
	temporalNamespace: string
	taskQueue: string
	digestChannel: 'email' | 'tg'
}

let loaded = false

// --- Core functions ---

export function loadEnv(): AgentsEnv {
	loadDotenv()
	return {
		gatewayUrl: required('SCOUT_GATEWAY_URL'),
		gatewayAdminSecret: required('SCOUT_GATEWAY_ADMIN_SECRET'),
		temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
		temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
		taskQueue: process.env.CEO_TASK_QUEUE ?? CEO_TASK_QUEUE,
		digestChannel: process.env.SCOUT_DIGEST_CHANNEL === 'email' ? 'email' : 'tg'
	}
}

// --- Helper functions ---

// The monorepo shares one .env at the root; anchor on this file so the path holds for any caller.
export function loadDotenv(): void {
	if (loaded) return
	config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })
	loaded = true
}

function required(key: string): string {
	const value = process.env[key]
	if (!value) throw new Error(`Missing required env: ${key}`)
	return value
}
