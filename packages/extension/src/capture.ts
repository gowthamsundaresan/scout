export function capture() {
	return {
		url: location.href,
		title: document.title,
		html: document.documentElement.outerHTML,
		selection: window.getSelection()?.toString() || undefined
	}
}
