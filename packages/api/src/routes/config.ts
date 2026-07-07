import type { Request, Response } from 'express'

// --- Core functions ---

export function grokConfig(_req: Request, res: Response): void {
	const runIntervalHours = Number(process.env.GROK_RUN_INTERVAL_HOURS) || 6
	res.json({
		prompts: prompts(runIntervalHours),
		runIntervalHours,
		spacingMinutes: Number(process.env.GROK_SPACING_MINUTES) || 3,
		enabled: process.env.GROK_ENABLED !== 'false'
	})
}

// --- Helper functions ---

// Window follows the run cadence so the prompt and schedule never drift apart.
function defaultPrompts(hours: number): string[] {
	return [
		`Give me 5 high-quality signals in AI from top accounts in the last ${hours} hours. ` +
			'Specifically: developments in techniques, new repos, new tools, announcements, releases, ' +
			'funding, new companies getting funded, etc. Use your judgment to pick the top AI accounts ' +
			'as the base, then scour for any posts that received a lot of interactions. High quality ' +
			'only, non-crypto only.\n\n' +
			'Attach the whole tweet — high-quality signals only. If tweets from accounts outside your ' +
			'base set are higher signal, feel free to prioritize them. The response must be full tweets ' +
			'only, not your synthesis, and no redactions. No minimal follow-ups: the tweet you include ' +
			'must carry the signal itself, so I never need to reference back to the original tweets.'
	]
}

function prompts(hours: number): string[] {
	const raw = process.env.GROK_PROMPTS
	if (!raw) return defaultPrompts(hours)
	try {
		const parsed = JSON.parse(raw)
		if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === 'string')
	} catch {}
	return raw
		.split('\n')
		.map((p) => p.trim())
		.filter(Boolean)
}
