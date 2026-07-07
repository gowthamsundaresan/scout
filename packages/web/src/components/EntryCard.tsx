import type { CardEntry } from '../lib/types'
import { CardActions } from './reply'

export function EntryCard({ entry, sectionId }: { entry: CardEntry; sectionId: string }) {
	return (
		<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-wrap items-baseline gap-x-2">
					<span className="font-semibold text-neutral-100">{entry.name}</span>
					{entry.handle &&
						(entry.url ? (
							<a
								href={entry.url}
								target="_blank"
								rel="noreferrer"
								className="text-sm text-sky-400 hover:underline"
							>
								{entry.handle}
							</a>
						) : (
							<span className="text-sm text-neutral-400">{entry.handle}</span>
						))}
					{!entry.handle && entry.url && (
						<a
							href={entry.url}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-sky-400 hover:underline"
						>
							source ↗
						</a>
					)}
				</div>
				<CardActions sectionId={sectionId} name={entry.name} entryKey={entry.key} />
			</div>
			<p className="mt-2 text-sm leading-relaxed text-neutral-300">{entry.why}</p>
			{entry.message && (
				<div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm leading-relaxed text-neutral-200">
					{entry.message}
				</div>
			)}
			{entry.pitch && (
				<p className="mt-2 text-sm text-neutral-400">
					<span className="text-neutral-500">Pitch — </span>
					{entry.pitch}
				</p>
			)}
		</div>
	)
}
