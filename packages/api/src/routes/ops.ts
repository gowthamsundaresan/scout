import type { Request, Response } from 'express'

import { IngestJob, SearchSeed } from '@scout/indexer'
import type { Namespace } from '@scout/memory'
import { list, query } from '@scout/memory'

// --- Types & state ---

const NAMESPACES: readonly string[] = ['self', 'world', 'system']

// --- Core functions ---

export async function jobs(req: Request, res: Response): Promise<void> {
	const filter: Record<string, unknown> = {}
	if (typeof req.query.status === 'string') filter.status = req.query.status
	if (typeof req.query.source === 'string') filter.source = req.query.source

	const [counts, recent] = await Promise.all([
		IngestJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
		IngestJob.find(filter).sort({ updatedAt: -1 }).limit(limitOf(req, 50)).lean()
	])

	res.json({
		counts: Object.fromEntries(counts.map((c: { _id: string; count: number }) => [c._id, c.count])),
		jobs: recent
	})
}

export async function seeds(req: Request, res: Response): Promise<void> {
	const found = await SearchSeed.find().sort({ updatedAt: -1 }).limit(limitOf(req, 200)).lean()
	res.json({ seeds: found })
}

export async function decisions(req: Request, res: Response): Promise<void> {
	res.json({ decisions: await systemList(req, 'decision') })
}

export async function lessons(req: Request, res: Response): Promise<void> {
	res.json({ lessons: await systemList(req, 'lesson') })
}

export async function memoryBrowse(req: Request, res: Response): Promise<void> {
	const namespace = req.query.namespace
	if (!isNamespace(namespace)) {
		res.status(400).json({ error: 'namespace must be one of self, world, system' })
		return
	}

	const q = typeof req.query.q === 'string' ? req.query.q : undefined
	const type = typeof req.query.type === 'string' ? req.query.type : undefined
	const limit = limitOf(req, 50)

	const records = q
		? await query(namespace, { q, type, limit })
		: await list(namespace, { type, limit })
	res.json({ records })
}

// --- Helper functions ---

export function limitOf(req: Request, fallback: number): number {
	const n = Number(req.query.limit)
	return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 500) : fallback
}

function isNamespace(value: unknown): value is Namespace {
	return typeof value === 'string' && NAMESPACES.includes(value)
}

// query needs a q (similarity search); list enumerates newest-first
async function systemList(req: Request, type: string) {
	const q = typeof req.query.q === 'string' ? req.query.q : undefined
	const limit = limitOf(req, 100)
	return q ? query('system', { q, type, limit }) : list('system', { type, limit })
}
