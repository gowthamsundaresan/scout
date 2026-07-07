import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerClient, sendMessage } from '../src/gateway/client'

afterEach(() => {
	vi.restoreAllMocks()
})

function mockFetch(status: number, body: unknown) {
	const fetchMock = vi.fn(async () => ({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body)
	}))
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

describe('gateway client', () => {
	it('registers via the admin plane with X-API-Key', async () => {
		const fetchMock = mockFetch(200, { clientId: 'ceo', jwt: 'jwt.token', scope: { send: true } })
		const reg = await registerClient(
			{ baseUrl: 'http://gw:3000/', adminSecret: 'admin' },
			{ clientId: 'ceo', name: 'ceo', scope: { send: true } }
		)
		expect(reg.jwt).toBe('jwt.token')
		const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		expect(url).toBe('http://gw:3000/register')
		expect((opts.headers as Record<string, string>)['X-API-Key']).toBe('admin')
	})

	it('sends with a Bearer JWT and returns status', async () => {
		const fetchMock = mockFetch(200, { messageId: 'm1', status: 'delivered' })
		const res = await sendMessage(
			{ baseUrl: 'http://gw:3000', jwt: 'jwt.token' },
			{
				messageId: 'm1',
				templateId: 'digest-recommend',
				intent: 0,
				vars: { title: 't', body: 'b' }
			}
		)
		expect(res.status).toBe('delivered')
		const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		expect(url).toBe('http://gw:3000/send')
		expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer jwt.token')
	})

	it('passes structured card data through the send body', async () => {
		const fetchMock = mockFetch(200, { messageId: 'm2', status: 'delivered' })
		await sendMessage(
			{ baseUrl: 'http://gw:3000', jwt: 'jwt.token' },
			{
				messageId: 'm2',
				templateId: 'digest-recommend',
				intent: 0,
				vars: { title: 't', body: 'b' },
				data: { entries: [{ kind: 'person', name: 'Jane', why: 'ships infra' }] }
			}
		)
		const [, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		const body = JSON.parse(opts.body as string)
		expect(body.data.entries[0].name).toBe('Jane')
	})

	it('throws on a non-2xx response', async () => {
		mockFetch(401, { error: 'unauthorized' })
		await expect(
			sendMessage({ baseUrl: 'http://gw:3000', jwt: 'bad' }, { templateId: 't', intent: 0 })
		).rejects.toThrow(/gateway \/send 401/)
	})
})
