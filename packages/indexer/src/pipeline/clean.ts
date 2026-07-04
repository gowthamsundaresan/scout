import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export type Cleaned = {
	title: string
	text: string
}

export type CleanInput = {
	url: string
	title?: string
	html?: string
	text?: string
}

export function clean(input: CleanInput): Cleaned {
	if (input.text) {
		return { title: input.title ?? '', text: input.text.trim() }
	}
	if (!input.html) {
		return { title: input.title ?? '', text: '' }
	}
	const dom = new JSDOM(input.html, { url: input.url })
	const article = new Readability(dom.window.document).parse()
	return {
		title: article?.title ?? input.title ?? '',
		text: article?.textContent?.trim() ?? ''
	}
}
