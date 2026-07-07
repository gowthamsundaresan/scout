// --- Types & state ---

export type ReceiveBody = {
	messageId: string
	replyToMessageId: string
	payload: Record<string, unknown>
}

export type ReceiveResult = { messageId: string; forwardedTo: string[] }

// --- Core functions ---

export async function registerSelf(
	baseUrl: string,
	adminSecret: string,
	clientId: string
): Promise<string> {
	const res = await post(
		baseUrl,
		'/register',
		{ 'X-API-Key': adminSecret },
		{
			clientId,
			name: clientId,
			scope: { send: true }
		}
	)
	return (res as { jwt: string }).jwt
}

export function receiveMessage(
	baseUrl: string,
	jwt: string,
	body: ReceiveBody
): Promise<ReceiveResult> {
	return post(baseUrl, '/receive', { Authorization: `Bearer ${jwt}` }, body)
}

// --- Helper functions ---

async function post<T>(
	baseUrl: string,
	path: string,
	headers: Record<string, string>,
	body: unknown
): Promise<T> {
	const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	})
	if (!res.ok) {
		throw new Error(`gateway ${path} ${res.status}: ${await res.text()}`)
	}
	return (await res.json()) as T
}
