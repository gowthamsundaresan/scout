// Lazy accessors so `next build` needs no secrets; pages are force-dynamic and read at request time.

export const env = {
	gatewayUrl: () => required('GATEWAY_URL'),
	gatewayJwt: () => required('GATEWAY_JWT'),
	scoutApiUrl: () => required('SCOUT_API_URL'),
	scoutApiToken: () => required('SCOUT_API_TOKEN'),
	dashPassword: () => required('DASH_PASSWORD'),
	cookieSecret: () => required('DASH_COOKIE_SECRET')
}

function required(key: string): string {
	const value = process.env[key]
	if (!value) throw new Error(`Missing required env: ${key}`)
	return value
}
