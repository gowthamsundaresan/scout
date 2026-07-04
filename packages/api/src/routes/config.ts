import type { Request, Response } from 'express'

// --- Types & state ---

const DEFAULT_PROMPTS = [
	'You have live access to X. List up to 15 notable people across AI, AI×crypto, crypto, and ' +
		'venture-building who posted something noteworthy in the last ~6 hours. For each: name, X handle, ' +
		'one line on why they are notable, and a one-line summary of what they posted.'
]

// --- Core functions ---

export function grokConfig(_req: Request, res: Response): void {
	res.json({
		prompts: prompts(),
		runIntervalHours: Number(process.env.GROK_RUN_INTERVAL_HOURS) || 6,
		spacingMinutes: Number(process.env.GROK_SPACING_MINUTES) || 3,
		enabled: process.env.GROK_ENABLED !== 'false'
	})
}

// --- Helper functions ---

function prompts(): string[] {
	const raw = process.env.GROK_PROMPTS
	if (!raw) return DEFAULT_PROMPTS
	try {
		const parsed = JSON.parse(raw)
		if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === 'string')
	} catch {}
	return raw
		.split('\n')
		.map((p) => p.trim())
		.filter(Boolean)
}
