import { describe, expect, it, vi } from 'vitest'

import { query } from '../src/memory'

const searchCalls = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock('../src/client', () => ({
	getClient: () => ({
		search: {
			memories: async (params: Record<string, unknown>) => {
				searchCalls.push(params)
				return { results: [] }
			}
		}
	})
}))

describe('query', () => {
	it('pushes the type filter server-side and passes rerank through', async () => {
		await query('system', { q: 'digest lessons', type: 'lesson', rerank: true, limit: 8 })
		expect(searchCalls[0].filters).toEqual({
			AND: [{ key: 'type', value: 'lesson', filterType: 'metadata' }]
		})
		expect(searchCalls[0].rerank).toBe(true)
		expect(searchCalls[0].limit).toBe(8)
	})

	it('sends no filters when type is not set', async () => {
		await query('world', { q: 'people' })
		expect(searchCalls[1].filters).toBeUndefined()
	})
})
