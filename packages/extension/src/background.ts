import { capture } from './capture'
import { getFeedState, getSettings } from './config'
import { feederTick, pollConfig, probeLogin } from './feeder'
import { setStatsigId } from './grok/statsig'
import { postIngest } from './ingest'
import type { IngestResult } from './ingest'
import { flushIngestQueue } from './queue'

// --- Types & state ---

const MENU_PAGE = 'scout-clip-page'
const MENU_SELECTION = 'scout-clip-selection'
const CONFIG_POLL_MS = 30 * 60 * 1000
const LOGIN_POLL_MS = 2 * 60 * 1000
const QUEUE_FLUSH_MS = 5 * 60 * 1000
let started = false
let grokRunning = false
let drainTimer: ReturnType<typeof setTimeout> | null = null

// --- Core functions ---

chrome.runtime.onInstalled.addListener(() => {
	createMenus()
	void startApp()
})
chrome.runtime.onStartup.addListener(() => void startApp())
void startApp()

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (!tab) return
	if (info.menuItemId === MENU_SELECTION && info.selectionText) {
		void clip(tab, info.selectionText)
	} else if (info.menuItemId === MENU_PAGE) {
		void clip(tab)
	}
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg?.action === 'GROK_STATSIG_ID' && msg.statsigId) {
		setStatsigId(msg.statsigId)
		return undefined
	}
	if (msg?.action === 'keepalive') return undefined
	if (msg?.action === 'settings-changed') {
		void syncGrok()
		return undefined
	}
	if (msg?.action === 'probe-login') {
		probeLogin()
			.then((isLoggedIn) => sendResponse({ isLoggedIn }))
			.catch(() => sendResponse({ isLoggedIn: false }))
		return true
	}
	if (msg?.type === 'clip-page') {
		clipActiveTab()
			.then(sendResponse)
			.catch((err) => sendResponse({ ok: false, error: (err as Error).message }))
		return true
	}
	return undefined
})

// Run a due batch the moment login returns, rather than waiting for the next tick.
chrome.storage.onChanged.addListener((changes, ns) => {
	if (ns !== 'local' || !changes.grokLogin || !grokRunning) return
	const was = changes.grokLogin.oldValue as { isLoggedIn?: boolean } | undefined
	const now = changes.grokLogin.newValue as { isLoggedIn?: boolean } | undefined
	if (!was?.isLoggedIn && now?.isLoggedIn) {
		void feederTick().catch((err) => console.error('[scout] feeder:', err))
	}
})

// --- Helper functions ---

async function startApp(): Promise<void> {
	if (started) return
	started = true
	await pollConfig()
	setInterval(() => void pollConfig(), CONFIG_POLL_MS)
	void probeLogin()
	setInterval(() => void probeLogin(), LOGIN_POLL_MS)
	void flushIngestQueue()
	setInterval(() => void flushIngestQueue(), QUEUE_FLUSH_MS)
	await syncGrok()
}

async function syncGrok(): Promise<void> {
	const { grokEnabled } = await getSettings()
	if (grokEnabled) {
		if (grokRunning) return
		grokRunning = true
		await ensureOffscreen()
		void scheduleDrain()
	} else {
		grokRunning = false
		if (drainTimer) {
			clearTimeout(drainTimer)
			drainTimer = null
		}
		await closeOffscreen()
	}
}

async function ensureOffscreen(): Promise<void> {
	try {
		if (await chrome.offscreen.hasDocument()) return
		await chrome.offscreen.createDocument({
			url: 'offscreen.html',
			reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
			justification: 'keep the worker alive and capture the grok statsig id'
		})
	} catch (err) {
		if (!String(err).includes('Only a single offscreen document')) {
			console.error('[scout] offscreen:', err)
		}
	}
}

async function closeOffscreen(): Promise<void> {
	try {
		if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument()
	} catch {}
}

async function scheduleDrain(): Promise<void> {
	const { spacingMinutes } = await getFeedState()
	const base = Math.max(1, spacingMinutes) * 60 * 1000
	const jittered = base * (0.75 + Math.random() * 0.5)
	drainTimer = setTimeout(() => {
		feederTick()
			.catch((err) => console.error('[scout] feeder:', err))
			.finally(() => {
				if (grokRunning) void scheduleDrain()
			})
	}, jittered)
}

function createMenus(): void {
	chrome.contextMenus.create({
		id: MENU_PAGE,
		title: 'Clip this page to Scout',
		contexts: ['page']
	})
	chrome.contextMenus.create({
		id: MENU_SELECTION,
		title: 'Clip selection to Scout',
		contexts: ['selection']
	})
}

async function clipActiveTab(): Promise<IngestResult> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab) throw new Error('no active tab')
	return clip(tab)
}

async function clip(tab: chrome.tabs.Tab, selection?: string): Promise<IngestResult> {
	const { apiBase, token } = await getSettings()
	if (!apiBase || !token) throw new Error('set the API base + token in the popup settings first')
	const capturedAt = new Date().toISOString()

	if (selection) {
		return postIngest(apiBase, token, 'clipper', {
			url: tab.url ?? '',
			title: tab.title,
			selection,
			capturedAt
		})
	}
	if (!tab.id) throw new Error('no tab id')
	const [injection] = await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: capture
	})
	return postIngest(apiBase, token, 'clipper', { ...injection.result, capturedAt })
}
