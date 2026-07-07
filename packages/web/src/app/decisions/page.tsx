import { formatDate } from '../../lib/digest'
import { opsDecisions } from '../../lib/scout'

export const dynamic = 'force-dynamic'

const VERDICT_COLOR: Record<string, string> = {
	accepted: 'bg-emerald-500/10 text-emerald-400',
	rejected: 'bg-red-500/10 text-red-400',
	surfaced: 'bg-sky-500/10 text-sky-400',
	'self-rejected': 'bg-amber-500/10 text-amber-400'
}

export default async function DecisionsPage({
	searchParams
}: {
	searchParams: Promise<{ q?: string }>
}) {
	const { q } = await searchParams
	const { decisions } = await opsDecisions(q)

	return (
		<div>
			<form action="/decisions">
				<input
					name="q"
					defaultValue={q ?? ''}
					placeholder="Search decisions…"
					className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
				/>
			</form>
			<div className="mt-5 space-y-3">
				{!decisions.length && (
					<p className="py-8 text-center text-sm text-neutral-500">No decisions yet.</p>
				)}
				{decisions.map((decision) => (
					<div
						key={decision.dedupeKey}
						className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
					>
						<div className="flex items-center justify-between gap-3">
							<span
								className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_COLOR[decision.verdict] ?? 'bg-neutral-800 text-neutral-300'}`}
							>
								{decision.verdict}
							</span>
							<span className="text-xs text-neutral-500">{formatDate(decision.decidedAt)}</span>
						</div>
						<p className="mt-2 font-medium text-neutral-100">{decision.title}</p>
						<p className="mt-1 text-sm leading-relaxed text-neutral-400">{decision.body}</p>
						<p className="mt-2 font-mono text-xs text-neutral-600">{decision.targetKey}</p>
					</div>
				))}
			</div>
		</div>
	)
}
