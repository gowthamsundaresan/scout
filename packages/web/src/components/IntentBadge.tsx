export function IntentBadge({ intent }: { intent?: number }) {
	const skip = intent === 1
	return (
		<span
			className={`rounded-full px-2 py-0.5 text-xs font-medium ${
				skip ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
			}`}
		>
			{skip ? 'skip' : 'recommend'}
		</span>
	)
}
