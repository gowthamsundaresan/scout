'use client'

// Renders in the browser's timezone; the server-rendered (UTC on Vercel) text is corrected on
// hydration, hence suppressHydrationWarning.
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
	const date = new Date(iso)
	const now = new Date()
	const withYear = date.getFullYear() !== now.getFullYear()
	return (
		<time dateTime={iso} suppressHydrationWarning className={className}>
			{date.toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				...(withYear ? { year: 'numeric' } : {}),
				hour: 'numeric',
				minute: '2-digit'
			})}
		</time>
	)
}
