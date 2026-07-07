import type { Metadata } from 'next'
import Link from 'next/link'

import { LocalTime } from '../../components/LocalTime'
import { PageHeader } from '../../components/PageHeader'
import { opsDecisions, opsLessons } from '../../lib/scout'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'evals' }

const VERDICT: Record<string, string> = {
	accepted: 'bg-c-green text-bg font-semibold',
	rejected: 'border-c-red text-c-red border',
	surfaced: 'border-c-blue text-c-blue border',
	'self-rejected': 'border-c-yellow text-c-yellow border'
}

export default async function EvalsPage({
	searchParams
}: {
	searchParams: Promise<{ tab?: string; q?: string }>
}) {
	const { tab, q } = await searchParams
	const active = tab === 'lessons' ? 'lessons' : 'decisions'
	const tabHref = (t: string) => {
		const qs = new URLSearchParams()
		if (t === 'lessons') qs.set('tab', 'lessons')
		if (q) qs.set('q', q)
		const s = qs.toString()
		return s ? `/evals?${s}` : '/evals'
	}

	return (
		<div>
			<PageHeader
				title="Evals"
				blurb="The self-improvement loop — your verdicts become decisions, judges distill lessons."
			/>

			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex gap-2">
					<Tab href={tabHref('decisions')} active={active === 'decisions'} label="decisions" />
					<Tab href={tabHref('lessons')} active={active === 'lessons'} label="lessons" />
				</div>
				<form action="/evals" className="max-w-52 min-w-40 flex-1">
					{active === 'lessons' && <input type="hidden" name="tab" value="lessons" />}
					<input
						name="q"
						defaultValue={q ?? ''}
						placeholder="search…"
						className="border-line text-ink placeholder:text-ink-faint focus:border-ink-faint w-full border-b bg-transparent pb-1 font-mono text-[13px] transition-colors duration-300 outline-none"
					/>
				</form>
			</div>

			<div className="mt-8">{active === 'decisions' ? <Decisions q={q} /> : <Lessons q={q} />}</div>
		</div>
	)
}

async function Decisions({ q }: { q?: string }) {
	const res = await opsDecisions(q).catch(() => null)
	if (!res) return <Unreachable />
	const { decisions } = res
	if (!decisions.length) return <p className="text-ink-faint text-[14px]">no decisions yet.</p>
	return (
		<div>
			{decisions.map((decision) => (
				<div key={decision.dedupeKey} className="border-line border-b py-5">
					<div className="flex flex-wrap items-baseline gap-3">
						<span
							className={`rounded-[3px] px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase ${VERDICT[decision.verdict] ?? 'border-line text-ink-dim border'}`}
						>
							{decision.verdict}
						</span>
						<span className="text-ink text-[15px] font-medium tracking-[-0.015em]">
							{decision.title.replace(/^[a-z-]+: /, '')}
						</span>
						<span className="text-ink-faint ml-auto font-mono text-[11px]">
							<LocalTime iso={decision.decidedAt} />
						</span>
					</div>
					<p className="text-ink-dim mt-2 max-w-[60ch] text-[14px] leading-[1.62]">
						{decision.body}
					</p>
					<Link
						href={`/memory?namespace=world&q=${encodeURIComponent(decision.title.replace(/^[a-z-]+: /, ''))}`}
						className="text-ink-faint hover:text-ink mt-1.5 inline-block font-mono text-[10.5px] break-all underline decoration-1 underline-offset-[3px] transition-colors duration-300"
					>
						{decision.targetKey}
					</Link>
				</div>
			))}
		</div>
	)
}

async function Lessons({ q }: { q?: string }) {
	const res = await opsLessons(q).catch(() => null)
	if (!res) return <Unreachable />
	const { lessons } = res
	if (!lessons.length) return <p className="text-ink-faint text-[14px]">no lessons yet.</p>
	return (
		<div>
			{lessons.map((lesson) => (
				<div key={lesson.dedupeKey} className="border-line border-b py-5">
					<p className="eyebrow text-ink-faint text-[10px]">{lesson.title}</p>
					<p className="text-ink-dim mt-1.5 max-w-[60ch] text-[15px] leading-[1.62]">
						{lesson.body}
					</p>
				</div>
			))}
		</div>
	)
}

function Unreachable() {
	return (
		<span className="border-c-red/40 text-c-red rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
			memory unreachable
		</span>
	)
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
	return (
		<Link
			href={href}
			className={`rounded-[5px] px-2.5 py-1 font-mono text-[11.5px] tracking-[0.1em] uppercase transition-colors duration-300 ${
				active ? 'bg-raised text-ink' : 'text-ink-faint hover:text-ink'
			}`}
		>
			{label}
		</Link>
	)
}
