import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EVALS_TASK_QUEUE } from './constants'

// --- Types & state ---

export type EvalsEnv = {
	temporalAddress: string
	temporalNamespace: string
	taskQueue: string
	port: number
	forwardSecret?: string
}

export type BootstrapEnv = {
	gatewayUrl: string
	gatewayAdminSecret: string
	receiveUrl: string
}

let loaded = false

// --- Core functions ---

export function loadEnv(): EvalsEnv {
	loadDotenv()
	return {
		temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
		temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
		taskQueue: process.env.EVALS_TASK_QUEUE ?? EVALS_TASK_QUEUE,
		port: Number(process.env.EVALS_PORT ?? 8788),
		// Required by the receiver only; it fails loud at startup, the worker never needs it.
		forwardSecret: process.env.FORWARD_SECRET
	}
}

export function loadBootstrapEnv(): BootstrapEnv {
	loadDotenv()
	return {
		gatewayUrl: required('SCOUT_GATEWAY_URL'),
		gatewayAdminSecret: required('SCOUT_GATEWAY_ADMIN_SECRET'),
		receiveUrl: required('EVALS_RECEIVE_URL')
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
