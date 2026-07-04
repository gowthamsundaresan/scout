export async function getSsoCookie(): Promise<string | null> {
	try {
		const cookie = await chrome.cookies.get({ url: 'https://grok.com', name: 'sso' })
		return cookie?.value || null
	} catch {
		return null
	}
}
