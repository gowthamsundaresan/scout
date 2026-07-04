import Exa from 'exa-js'

let client: Exa | undefined

export function getExa(): Exa {
	if (!client) client = new Exa(process.env.EXA_API_KEY)
	return client
}
