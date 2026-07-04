import { getFeedState, getSettings, setFeedState } from './config'
import { runGrok } from './grok/driver'
import { getSsoCookie } from './grok/sso'
import { getStatsigId } from './grok/statsig'
import { postIngest } from './ingest'

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

export async function feederTick(): Promise<void> {
	const settings = await getSettings()
	const state = await getFeedState()
	if (!settings.grokEnabled || !state.configEnabled) return

	let queue = state.queue
	if (queue.length === 0) {
		const due = Date.now() - state.lastBatchAt >= state.runIntervalHours * 3_600_000
		if (!due || state.prompts.length === 0) return
		queue = [...state.prompts]
		await setFeedState({ queue, lastBatchAt: Date.now() })
	}

	const prompt = queue[0]
	await setFeedState({ queue: queue.slice(1) })

	if (!(await getSsoCookie())) return

	const result = await runGrok(prompt, getStatsigId())
	if (result.success && result.answer) {
		await postIngest(settings.apiBase, settings.token, 'grok', {
			text: result.answer,
			sourceRef: `grok://${slug(prompt)}/${Date.now()}`,
			capturedAt: new Date().toISOString()
		})
	}
}

function slug(s: string): string {
	let h = 0
	for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
	return (h >>> 0).toString(36)
}
