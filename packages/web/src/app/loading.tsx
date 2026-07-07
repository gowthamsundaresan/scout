export default function Loading() {
	return (
		<div className="space-y-4 pt-2">
			<div className="bg-raised/40 h-6 w-40 animate-pulse rounded" />
			<div className="bg-raised/25 h-4 w-72 animate-pulse rounded" />
			<div className="mt-8 space-y-3">
				{[0, 1, 2, 3].map((i) => (
					<div
						key={i}
						className="bg-raised/20 h-20 animate-pulse rounded"
						style={{ animationDelay: `${i * 0.12}s` }}
					/>
				))}
			</div>
		</div>
	)
}
