import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// --- Types & state ---

export type TgIngressEnv = {
	botToken: string
	chatId: string
	gatewayUrl: string
	gatewayAdminSecret: string
}

let loaded = false

// --- Core functions ---

export function loadEnv(): TgIngressEnv {
	loadDotenv()
	return {
		botToken: required('TELEGRAM_BOT_TOKEN'),
		chatId: required('TELEGRAM_CHAT_ID'),
		gatewayUrl: required('SCOUT_GATEWAY_URL'),
		gatewayAdminSecret: required('SCOUT_GATEWAY_ADMIN_SECRET')
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
