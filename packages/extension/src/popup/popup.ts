import { getSettings, setSettings } from '../config'
import type { IngestResult } from '../ingest'

function el<T extends HTMLElement>(id: string): T {
	return document.getElementById(id) as T
}

function status(msg: string): void {
	el('status').textContent = msg
}

async function init(): Promise<void> {
	const s = await getSettings()
	el<HTMLInputElement>('apiBase').value = s.apiBase
	el<HTMLInputElement>('token').value = s.token
	el<HTMLInputElement>('grokEnabled').checked = s.grokEnabled

	el('save').addEventListener('click', async () => {
		await setSettings({
			apiBase: el<HTMLInputElement>('apiBase').value.trim().replace(/\/+$/, ''),
			token: el<HTMLInputElement>('token').value.trim(),
			grokEnabled: el<HTMLInputElement>('grokEnabled').checked
		})
		chrome.runtime.sendMessage({ action: 'settings-changed' }).catch(() => {})
		status('settings saved')
	})

	el('clip').addEventListener('click', () => {
		status('clipping…')
		chrome.runtime.sendMessage({ type: 'clip-page' }, (res: IngestResult) => {
			status(
				res?.ok
					? `queued (${res.jobId ?? 'ok'})`
					: `failed: ${res?.error ?? res?.status ?? 'error'}`
			)
		})
	})
}

void init()
