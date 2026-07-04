import 'dotenv/config'

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
