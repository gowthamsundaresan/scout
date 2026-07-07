import { getFeedState, getSettings, setFeedState, setLoginStatus } from './config'
import { runGrok } from './grok/driver'
import { getSsoCookie } from './grok/sso'
import { getStatsigId } from './grok/statsig'
import { postIngest } from './ingest'

// --- Core functions ---

export async function pollConfig(): Promise<void> {
	const { apiBase } = await getSettings()
	if (!apiBase) return
	try {
		const res = await fetch(`${apiBase}/config/grok`)
		if (!res.ok) return
		const cfg = (await res.json()) as {
			prompts?: string[]
			runIntervalHours?: number
			spacingMinutes?: number
			enabled?: boolean
		}
		await setFeedState({
			prompts: cfg.prompts ?? [],
			runIntervalHours: cfg.runIntervalHours ?? 6,
			spacingMinutes: cfg.spacingMinutes ?? 3,
			configEnabled: cfg.enabled ?? true
		})
	} catch {}
}

export async function probeLogin(): Promise<boolean> {
	const isLoggedIn = !!(await getSsoCookie())
	await setLoginStatus({ isLoggedIn, checkedAt: Date.now() })
	return isLoggedIn
}

export async function feederTick(): Promise<void> {
	const settings = await getSettings()
	const state = await getFeedState()
	if (!settings.grokEnabled || !state.configEnabled || state.prompts.length === 0) return

	const due = Date.now() - state.lastBatchAt >= state.runIntervalHours * 3_600_000
	if (!due) return

	// Gate on login before touching lastBatchAt so a disconnected epoch is not
	// consumed — the batch runs when the login poll next flips to connected.
	if (!(await probeLogin())) return

	for (let i = 0; i < state.prompts.length; i++) {
		if (i > 0) await sleep(Math.max(1, state.spacingMinutes) * 60_000)
		const prompt = state.prompts[i]
		const result = await runGrok(prompt, getStatsigId())
		if (result.success && result.answer) {
			await postIngest(settings.apiBase, settings.token, 'grok', {
				text: result.answer,
				sourceRef: `grok://${slug(prompt)}/${Date.now()}`,
				capturedAt: new Date().toISOString()
			})
		}
	}
	await setFeedState({ lastBatchAt: Date.now() })
}

// --- Helper functions ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function slug(s: string): string {
	let h = 0
	for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
	return (h >>> 0).toString(36)
}
