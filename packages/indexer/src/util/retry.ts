export async function retry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 500): Promise<T> {
	let lastErr: unknown
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn()
		} catch (err) {
			lastErr = err
			if (i < attempts - 1) await sleep(baseMs * 2 ** i)
		}
	}
	throw lastErr
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
