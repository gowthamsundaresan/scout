import type { Metadata } from 'next'
import Link from 'next/link'

import { EntryCard } from '../../components/EntryCard'
import { IntentBadge } from '../../components/IntentBadge'
import { LocalTime } from '../../components/LocalTime'
import { PageHeader } from '../../components/PageHeader'
import { Reveal } from '../../components/Reveal'
import { Thread } from '../../components/Thread'
import { ReplyBox } from '../../components/reply'
import {
	type DigestRun,
	type SectionPair,
	cardsOf,
	groupRuns,
	groupSections
} from '../../lib/digest'
import { getThread, listMessages } from '../../lib/gateway'
import type { GatewayMessage } from '../../lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'digest' }

// Threads + reply affordances for the most recent runs only; older runs are read-only history
const INTERACTIVE_RUNS = 3

export default async function DigestPage({
	searchParams
}: {
	searchParams: Promise<{ before?: string }>
}) {
	const { before } = await searchParams
	const page = await listMessages({
		fromClientId: 'ceo',
		direction: 'out',
		limit: 40,
		before
	}).catch(() => null)

	if (!page) {
		return (
			<>
				<Header />
				<span className="border-c-red/40 text-c-red rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
					gateway unreachable
				</span>
			</>
		)
	}

	let runs = groupRuns(page.messages)
	// The page boundary can slice a run in half — drop the (possibly partial) oldest run
	if (page.nextCursor && runs.length > 1) runs = runs.slice(0, -1)

	if (!runs.length) {
		return (
			<>
				<Header />
				<div className="flex min-h-[45vh] flex-col items-center justify-center gap-4">
					<span className="bg-c-green animate-pulse-dot h-1.5 w-1.5 rounded-full shadow-[0_0_8px_var(--color-c-green)]" />
					<p className="eyebrow text-ink-faint">awaiting first digest</p>
				</div>
			</>
		)
	}

	const interactive = before ? [] : runs.slice(0, INTERACTIVE_RUNS)
	const threads = await Promise.allSettled(
		interactive.flatMap((run) => run.sections.map((s) => getThread(s.message.messageId)))
	)
	const repliesBySection = new Map(
		threads
			.filter((t) => t.status === 'fulfilled')
			.map((t) => [t.value.message.messageId, t.value.replies])
	)

	return (
		<>
			<Header />
			<div className="relative">
				<span className="bg-line absolute top-2 bottom-2 left-[3px] w-px" />
				<div className="space-y-20">
					{runs.map((run, i) => (
						<RunView
							key={run.runId}
							run={run}
							latest={!before && i === 0}
							interactive={i < interactive.length}
							repliesBySection={repliesBySection}
						/>
					))}
				</div>
			</div>
			<div className="mt-14 flex gap-6">
				{before && (
					<Link
						href="/digest"
						className="text-ink-faint hover:text-ink font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-300"
					>
						← latest
					</Link>
				)}
				{page.nextCursor && (
					<Link
						href={`/digest?before=${page.nextCursor}`}
						className="text-ink-faint hover:text-ink font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-300"
					>
						older →
					</Link>
				)}
			</div>
		</>
	)
}

function Header() {
	return (
		<PageHeader
			title="Digest"
			blurb="What the CEO agent surfaced, every 6 hours — reply or verdict to teach it."
		/>
	)
}

function RunView({
	run,
	latest,
	interactive,
	repliesBySection
}: {
	run: DigestRun
	latest: boolean
	interactive: boolean
	repliesBySection: Map<string, GatewayMessage[]>
}) {
	const grouped = groupSections(run)
	const people = grouped.people.recommend ? cardsOf(grouped.people.recommend)?.entries.length : null
	const updates = grouped.ai.recommend ? cardsOf(grouped.ai.recommend)?.entries.length : null

	return (
		<section className="relative pl-9">
			<span
				className={`absolute top-[3px] left-0 h-[7px] w-[7px] rounded-full ${
					latest
						? 'bg-c-green animate-pulse-dot shadow-[0_0_8px_var(--color-c-green)]'
						: 'border-ink-faint bg-bg border'
				}`}
			/>
			<div className="eyebrow text-ink-faint flex flex-wrap items-baseline gap-x-3">
				<LocalTime iso={run.createdAt} />
				{latest && <span className="text-c-green">latest</span>}
				{(people ?? updates) != null && (
					<span className="normal-case">
						{people ?? 0} people · {updates ?? 0} updates
					</span>
				)}
			</div>
			<GroupView
				label="People"
				kind="people"
				pair={grouped.people}
				interactive={interactive}
				repliesBySection={repliesBySection}
			/>
			<GroupView
				label="AI Updates"
				kind="ai"
				pair={grouped.ai}
				interactive={interactive}
				repliesBySection={repliesBySection}
			/>
		</section>
	)
}

function GroupView({
	label,
	kind,
	pair,
	interactive,
	repliesBySection
}: {
	label: string
	kind: 'people' | 'ai'
	pair: SectionPair
	interactive: boolean
	repliesBySection: Map<string, GatewayMessage[]>
}) {
	if (!pair.recommend && !pair.anti) return null
	return (
		<Reveal className="mt-10">
			<h2 className="sec-label">{label}</h2>
			{pair.recommend && (
				<Subsection
					message={pair.recommend}
					kind={kind}
					anti={false}
					interactive={interactive}
					replies={repliesBySection.get(pair.recommend.messageId)}
				/>
			)}
			{pair.anti && (
				<Subsection
					message={pair.anti}
					kind={kind}
					anti={true}
					interactive={interactive}
					replies={repliesBySection.get(pair.anti.messageId)}
				/>
			)}
		</Reveal>
	)
}

function Subsection({
	message,
	kind,
	anti,
	interactive,
	replies
}: {
	message: GatewayMessage
	kind: 'people' | 'ai'
	anti: boolean
	interactive: boolean
	replies?: GatewayMessage[]
}) {
	const cards = cardsOf(message)
	const fallback = message.payload.rendered?.body ?? (message.payload.text as string | undefined)

	return (
		<div className="mt-7">
			<div className="flex items-baseline gap-3">
				<IntentBadge kind={kind} anti={anti} />
				{cards?.headline && (
					<span className="text-ink-faint text-[13.5px] italic">{cards.headline}</span>
				)}
			</div>
			{cards ? (
				<div className="mt-1">
					{cards.entries.map((entry, i) => (
						<EntryCard
							key={entry.key ?? `${entry.name}-${i}`}
							entry={entry}
							sectionId={message.messageId}
							index={i}
							interactive={interactive}
						/>
					))}
				</div>
			) : fallback ? (
				// Pre-cards messages only carry the rendered markdown body
				<pre className="border-line text-ink-dim mt-4 border-b pb-6 font-sans text-[14.5px] leading-[1.62] whitespace-pre-wrap">
					{fallback}
				</pre>
			) : (
				<p className="text-ink-faint mt-4 text-[13.5px]">no content in this section.</p>
			)}
			{interactive && replies && <Thread replies={replies} />}
			{interactive && <ReplyBox replyToMessageId={message.messageId} />}
		</div>
	)
}
