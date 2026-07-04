const iframe = document.createElement('iframe')
iframe.src = 'https://grok.com'
iframe.style.display = 'none'
document.body.appendChild(iframe)

window.addEventListener('message', (event: MessageEvent) => {
	const msg = event.data as { type?: string; data?: { statsigId?: string } } | undefined
	if (msg?.type === 'GROK_STATSIG_ID_CAPTURED' && msg.data?.statsigId) {
		chrome.runtime
			.sendMessage({ action: 'GROK_STATSIG_ID', statsigId: msg.data.statsigId })
			.catch(() => {})
	}
})

setInterval(() => {
	chrome.runtime.sendMessage({ action: 'keepalive' }).catch(() => {})
}, 20000)
