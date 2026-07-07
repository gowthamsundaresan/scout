// Injected by build.mjs from the monorepo .env; typeof-guarded so tests run without defines.
declare const __SCOUT_API_BASE__: string
declare const __SCOUT_INGEST_TOKEN__: string
const DEFAULT_API_BASE = typeof __SCOUT_API_BASE__ === 'undefined' ? '' : __SCOUT_API_BASE__
const DEFAULT_TOKEN = typeof __SCOUT_INGEST_TOKEN__ === 'undefined' ? '' : __SCOUT_INGEST_TOKEN__

export type Settings = {
	apiBase: string
	token: string
	grokEnabled: boolean
}

export type FeedState = {
	prompts: string[]
	runIntervalHours: number
	spacingMinutes: number
	configEnabled: boolean
	lastBatchAt: number
}

export type LoginStatus = { isLoggedIn: boolean; checkedAt: number }

export async function getSettings(): Promise<Settings> {
	const { apiBase, token, grokEnabled } = await chrome.storage.local.get([
		'apiBase',
		'token',
		'grokEnabled'
	])
	return {
		apiBase: apiBase ?? DEFAULT_API_BASE,
		token: token ?? DEFAULT_TOKEN,
		grokEnabled: grokEnabled ?? false
	}
}

export async function setSettings(settings: Partial<Settings>): Promise<void> {
	await chrome.storage.local.set(settings)
}

export async function getFeedState(): Promise<FeedState> {
	const d = await chrome.storage.local.get([
		'prompts',
		'runIntervalHours',
		'spacingMinutes',
		'configEnabled',
		'lastBatchAt'
	])
	return {
		prompts: d.prompts ?? [],
		runIntervalHours: d.runIntervalHours ?? 6,
		spacingMinutes: d.spacingMinutes ?? 3,
		configEnabled: d.configEnabled ?? true,
		lastBatchAt: d.lastBatchAt ?? 0
	}
}

export async function setFeedState(state: Partial<FeedState>): Promise<void> {
	await chrome.storage.local.set(state)
}

export async function getLoginStatus(): Promise<LoginStatus> {
	const { grokLogin } = await chrome.storage.local.get('grokLogin')
	return grokLogin ?? { isLoggedIn: false, checkedAt: 0 }
}

export async function setLoginStatus(patch: Partial<LoginStatus>): Promise<void> {
	const cur = await getLoginStatus()
	await chrome.storage.local.set({ grokLogin: { ...cur, ...patch } })
}
