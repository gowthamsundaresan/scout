'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
	return (
		<div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
			<span className="border-c-red/40 text-c-red rounded-[3px] border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] uppercase">
				something broke
			</span>
			<p className="text-ink-faint max-w-[52ch] text-center font-mono text-[12px] break-all">
				{error.message}
			</p>
			<button
				onClick={reset}
				className="text-ink-faint hover:text-ink cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase underline underline-offset-4 transition-colors duration-300"
			>
				retry
			</button>
		</div>
	)
}
