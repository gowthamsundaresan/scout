import Link from 'next/link'

import type { CardEntry } from '../lib/types'
import { CardActions } from './reply'

export function EntryCard({
	entry,
	sectionId,
	index,
	interactive
}: {
	entry: CardEntry
	sectionId: string
	index: number
	interactive: boolean
}) {
	const url = entry.url && /^https?:\/\//.test(entry.url) ? entry.url : undefined
	return (
		<div
			className="rise group border-line relative border-b py-6 transition-[padding] duration-[620ms] ease-(--ease-snap) md:hover:pl-4"
			style={{ animationDelay: `${0.05 + Math.min(index, 8) * 0.07}s` }}
		>
			<span className="bg-ink absolute top-0 -bottom-px left-0 hidden w-[2px] origin-top scale-y-0 transition-transform duration-[620ms] ease-(--ease-snap) group-hover:scale-y-100 md:block" />
			<div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
				{entry.key ? (
					<Link
						href={`/memory?namespace=world&q=${encodeURIComponent(entry.name)}`}
						title="find in memory"
						className="text-ink decoration-line hover:decoration-ink-faint text-[17px] font-medium tracking-[-0.015em] underline decoration-1 underline-offset-4 transition-colors duration-300"
					>
						{entry.name}
					</Link>
				) : (
					<span className="text-ink text-[17px] font-medium tracking-[-0.015em]">{entry.name}</span>
				)}
				{entry.handle && <HandleLink label={entry.handle} url={url} />}
				{!entry.handle && url && <HandleLink label="source" url={url} />}
				{interactive && (
					<span className="ml-auto">
						<CardActions sectionId={sectionId} name={entry.name} entryKey={entry.key} />
					</span>
				)}
			</div>
			<p className="text-ink-dim mt-2.5 max-w-[60ch] text-[15px] leading-[1.62]">{entry.why}</p>
			{entry.message && (
				<div className="border-line bg-raised/25 mt-4 rounded-[5px] border p-4">
					<div className="eyebrow text-ink-faint mb-1.5 text-[10px]">message</div>
					<p className="text-ink-dim text-[14.5px] leading-[1.62]">{entry.message}</p>
				</div>
			)}
			{entry.pitch && (
				<p className="text-ink-faint mt-3 text-[14px] leading-[1.62]">
					<span className="eyebrow mr-2 text-[10px]">pitch</span>
					{entry.pitch}
				</p>
			)}
		</div>
	)
}

function HandleLink({ label, url }: { label: string; url?: string }) {
	if (!url) return <span className="text-ink-faint font-mono text-[12px]">{label}</span>
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className="text-ink-faint decoration-ink-faint hover:text-ink hover:decoration-ink font-mono text-[12px] underline decoration-1 underline-offset-[3px] transition-colors duration-300"
		>
			{label} ↗
		</a>
	)
}
