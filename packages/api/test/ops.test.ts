import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { limitOf, memoryBrowse } from '../src/routes/ops'

function mockRes() {
	const res = {} as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
	res.status = vi.fn().mockReturnValue(res)
	res.json = vi.fn().mockReturnValue(res)
	return res
}

function reqWith(query: Record<string, unknown>): Request {
	return { query } as Request
}

describe('memoryBrowse', () => {
	it('400s on a missing namespace', async () => {
		const res = mockRes()
		await memoryBrowse(reqWith({}), res)
		expect(res.status).toHaveBeenCalledWith(400)
	})

	it('400s on an invalid namespace', async () => {
		const res = mockRes()
		await memoryBrowse(reqWith({ namespace: 'everything' }), res)
		expect(res.status).toHaveBeenCalledWith(400)
	})
})

describe('limitOf', () => {
	it('falls back when limit is absent or invalid', () => {
		expect(limitOf(reqWith({}), 50)).toBe(50)
		expect(limitOf(reqWith({ limit: 'abc' }), 50)).toBe(50)
		expect(limitOf(reqWith({ limit: '-3' }), 50)).toBe(50)
	})

	it('parses and clamps limit', () => {
		expect(limitOf(reqWith({ limit: '25' }), 50)).toBe(25)
		expect(limitOf(reqWith({ limit: '9999' }), 50)).toBe(500)
	})
})
