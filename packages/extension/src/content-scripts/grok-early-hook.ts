void (() => {
	const w = window as unknown as { __grokEarlyHook__?: boolean; fetch: typeof fetch }
	if (w.__grokEarlyHook__) return
	w.__grokEarlyHook__ = true

	if (window.parent !== window) {
		const nativeFetch = window.fetch.bind(window)
		w.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
			try {
				const h =
					input instanceof Request
						? input.headers
						: init?.headers
							? init.headers instanceof Headers
								? init.headers
								: new Headers(init.headers as HeadersInit)
							: null
				const sid = h instanceof Headers ? h.get('x-statsig-id') : null
				if (sid) {
					window.parent.postMessage(
						{ type: 'GROK_STATSIG_ID_CAPTURED', data: { statsigId: sid } },
						'*'
					)
				}
			} catch {}
			return nativeFetch(input, init)
		}
	}

	if (window.parent !== window) {
		window.parent.postMessage({ type: 'GROK_IFRAME_READY' }, '*')
	}
})()

export {}
