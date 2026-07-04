import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { pathToFileURL } from 'node:url'

import { connect } from '@scout/indexer'

import { loadEnv } from './env'
import { authBearer } from './hooks/auth'
import { grokConfig } from './routes/config'
import { health } from './routes/health'
import { ingest } from './routes/ingest'

// --- Helper functions ---

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
	return (req: Request, res: Response, next: NextFunction): void => {
		fn(req, res).catch(next)
	}
}

// --- Core functions ---

async function main(): Promise<void> {
	const env = loadEnv()
	await connect(env.mongoUri)

	const app = express()
	app.use(helmet())
	app.use(cors())
	app.use(express.json({ limit: '5mb' }))

	app.get('/health', health)
	app.get('/config/grok', grokConfig)
	app.post('/ingest/:source', authBearer(env.ingestSecret), wrap(ingest))

	app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
		console.error('[api] error:', err.message)
		res.status(500).json({ error: 'internal error' })
	})

	app.listen(env.port, () => console.log(`[api] listening on :${env.port}`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error('[api] fatal:', err)
		process.exit(1)
	})
}
