import type { NextFunction, Request, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'

export function authBearer(secret: string) {
	const expected = Buffer.from(secret)
	return (req: Request, res: Response, next: NextFunction): void => {
		const header = req.header('authorization') ?? ''
		const token = header.startsWith('Bearer ') ? header.slice(7) : ''
		const got = Buffer.from(token)
		if (got.length === expected.length && timingSafeEqual(got, expected)) {
			next()
			return
		}
		res.status(401).json({ error: 'unauthorized' })
	}
}
