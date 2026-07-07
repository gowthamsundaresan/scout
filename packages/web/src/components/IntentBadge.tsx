export function IntentBadge({ kind, anti }: { kind: 'people' | 'ai'; anti: boolean }) {
	const label = kind === 'people' ? (anti ? 'skip' : 'reach out') : anti ? 'noise' : 'worth reading'
	return (
		<span
			className={`rounded-[3px] px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] uppercase whitespace-nowrap ${
				anti ? 'border-c-red text-c-red border' : 'bg-c-green text-bg font-semibold'
			}`}
		>
			{label}
		</span>
	)
}
