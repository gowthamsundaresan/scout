import OpenAI from 'openai'

let client: OpenAI | undefined

export function getClient(): OpenAI {
	if (!client) {
		client = new OpenAI({
			baseURL: 'https://openrouter.ai/api/v1',
			apiKey: process.env.OPENROUTER_API_KEY,
			maxRetries: 0
		})
	}
	return client
}
