import type { Request, Response } from 'express'

import { enqueueFor } from '@scout/indexer'

export async function ingest(req: Request, res: Response): Promise<void> {
	try {
		const jobId = await enqueueFor(req.params.source, req.body)
		res.status(202).json({ jobId, status: 'queued' })
	} catch (err) {
		res.status(400).json({ error: (err as Error).message })
	}
}
