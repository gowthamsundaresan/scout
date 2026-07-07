import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// The monorepo shares one .env at the root; anchor on this file so the path holds for any caller.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })

export type Env = {
	port: number
	ingestSecret: string
	mongoUri: string
}

export function loadEnv(): Env {
	const { PORT, INGEST_SECRET, MONGO_URI } = process.env
	if (!INGEST_SECRET) throw new Error('INGEST_SECRET is required')
	if (!MONGO_URI) throw new Error('MONGO_URI is required')
	return { port: Number(PORT) || 4100, ingestSecret: INGEST_SECRET, mongoUri: MONGO_URI }
}
