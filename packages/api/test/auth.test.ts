import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { authBearer } from '../src/hooks/auth'

function mockRes() {
	const res = {} as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
	res.status = vi.fn().mockReturnValue(res)
	res.json = vi.fn().mockReturnValue(res)
	return res
}

function reqWith(auth?: string): Request {
	return {
		header: (k: string) => (k.toLowerCase() === 'authorization' ? auth : undefined)
	} as Request
}

describe('authBearer', () => {
	const mw = authBearer('s3cret')

	it('calls next on a valid bearer token', () => {
		const next = vi.fn()
		const res = mockRes()
		mw(reqWith('Bearer s3cret'), res, next)
		expect(next).toHaveBeenCalledOnce()
		expect(res.status).not.toHaveBeenCalled()
	})

	it('401s on a wrong token', () => {
		const next = vi.fn()
		const res = mockRes()
		mw(reqWith('Bearer nope'), res, next)
		expect(next).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(401)
	})

	it('401s on a missing header', () => {
		const next = vi.fn()
		const res = mockRes()
		mw(reqWith(undefined), res, next)
		expect(res.status).toHaveBeenCalledWith(401)
	})
})
