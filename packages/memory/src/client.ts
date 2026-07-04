import Supermemory from 'supermemory'

let client: Supermemory | undefined

export function getClient(): Supermemory {
	if (!client) {
		client = new Supermemory({ maxRetries: 3, timeout: 120000 })
	}
	return client
}
