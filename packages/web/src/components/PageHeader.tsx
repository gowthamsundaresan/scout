export function PageHeader({ title, blurb }: { title: string; blurb: string }) {
	return (
		<header className="mb-8">
			<h1 className="text-ink rise text-[clamp(20px,3vw,24px)] font-medium tracking-[-0.015em]">
				{title}
			</h1>
			<p className="text-ink-faint rise mt-1 text-[13.5px]" style={{ animationDelay: '0.08s' }}>
				{blurb}
			</p>
		</header>
	)
}
