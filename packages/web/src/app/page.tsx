import Link from 'next/link'

import { AutoRefresh } from '../components/AutoRefresh'
import { LocalTime } from '../components/LocalTime'
import { groupRuns } from '../lib/digest'
import { listMessages } from '../lib/gateway'
import { decisionTally, digestSnapshot, loopStatus, seedTally } from '../lib/overview'
import { memoryBrowse, opsDecisions, opsJobs, opsLessons, opsSeeds } from '../lib/scout'

export const dynamic = 'force-dynamic'

const JOB_COLOR: Record<string, string> = {
	done: 'text-c-green',
	queued: 'text-ink-faint',
	processing: 'text-c-blue',
	failed: 'text-c-red'
}

async function settle<T>(p: Promise<T>): Promise<T | null> {
	try {
		return await p
	} catch {
		return null
	}
}

export default async function OverviewPage() {
	const [gateway, jobs, seeds, decisions, lessons, world] = await Promise.all([
		settle(listMessages({ fromClientId: 'ceo', direction: 'out', limit: 20 })),
		settle(opsJobs({})),
		settle(opsSeeds()),
		settle(opsDecisions()),
		settle(opsLessons()),
		settle(memoryBrowse('world', undefined, undefined, 8))
	])

	const runs = gateway ? groupRuns(gateway.messages) : []
	const loop = gateway ? loopStatus(runs, gateway.messages, Date.now()) : null
	const snapshot = digestSnapshot(runs[0])
	const n = (v: number | null) => (v === null ? '—' : String(v))

	return (
		<div>
			<AutoRefresh seconds={120} />
			<h1 className="text-ink rise text-[clamp(26px,4vw,34px)] font-normal tracking-[-0.02em]">
				Scout
			</h1>
			<p className="text-ink-faint rise mt-1.5 text-[15px]" style={{ animationDelay: '0.1s' }}>
				A self-improving firm scouting people and AI, every 6 hours.
			</p>

			<div className="mt-10 grid gap-4 md:grid-cols-2">
				<Panel title="loop" href="/digest" wide>
					{loop?.lastRunAt ? (
						<div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
							<span className="flex items-center">
								<span
									className={`animate-pulse-dot mr-2.5 inline-block h-1.5 w-1.5 rounded-full ${
										loop.overdue
											? 'bg-c-red shadow-[0_0_8px_var(--color-c-red)]'
											: 'bg-c-green shadow-[0_0_8px_var(--color-c-green)]'
									}`}
								/>
								<span className="text-ink text-[15px]">
									last run <LocalTime iso={loop.lastRunAt} />
								</span>
							</span>
							<Stat label="sections" value={String(loop.sectionsSent)} />
							<Stat label="ping" value={loop.pingDelivered ? 'delivered' : '—'} />
							<Stat
								label="next"
								value={
									loop.hoursSince === null
										? '—'
										: loop.overdue
											? 'overdue'
											: `~${Math.max(0, 6 - loop.hoursSince).toFixed(1)}h`
								}
							/>
						</div>
					) : gateway ? (
						<Empty what="no runs yet" />
					) : (
						<Unreachable what="gateway" />
					)}
				</Panel>

				<Panel title="latest digest" href="/digest">
					{snapshot ? (
						<>
							<div className="text-ink text-[15px]">
								{n(snapshot.reachOut)} reach out · {n(snapshot.skip)} skip · {n(snapshot.updates)}{' '}
								updates · {n(snapshot.noise)} noise
							</div>
							{snapshot.names.length > 0 && (
								<p className="text-ink-faint mt-2 text-[13.5px]">{snapshot.names.join(' · ')}</p>
							)}
							{!snapshot.structured && (
								<p className="eyebrow text-ink-faint mt-2 text-[10px]">pre-cards format</p>
							)}
						</>
					) : gateway ? (
						<Empty what="no digests yet" />
					) : (
						<Unreachable what="gateway" />
					)}
				</Panel>

				<Panel title="pipeline" href="/pipeline">
					{jobs ? (
						<>
							<div className="flex flex-wrap gap-x-4 gap-y-1">
								{Object.entries(jobs.counts).map(([status, count]) => (
									<span key={status} className="text-[14px]">
										<span className={JOB_COLOR[status] ?? 'text-ink-dim'}>{count}</span>{' '}
										<span className="text-ink-faint">{status}</span>
									</span>
								))}
							</div>
							{seeds && <SeedLine tally={seedTally(seeds.seeds)} />}
						</>
					) : (
						<Unreachable what="scout api" />
					)}
				</Panel>

				<Panel title="feedback" href="/evals">
					{decisions ? (
						<>
							<TallyLine tally={decisionTally(decisions.decisions)} />
							{lessons?.lessons[0] && (
								<p className="text-ink-faint mt-2 line-clamp-2 text-[13.5px] leading-[1.6]">
									{lessons.lessons[0].body}
								</p>
							)}
						</>
					) : (
						<Unreachable what="memory" />
					)}
				</Panel>

				<Panel title="world pool" href="/memory" wide>
					{world ? (
						world.records.length ? (
							<div className="flex flex-wrap gap-2">
								{world.records.slice(0, 6).map((r) => (
									<span
										key={r.dedupeKey}
										className="bg-raised/40 max-w-full truncate rounded-[5px] px-2.5 py-1 text-[12.5px]"
									>
										<span className="text-ink-dim">{r.title}</span>{' '}
										<span className="text-ink-faint font-mono text-[10px]">{r.type}</span>
									</span>
								))}
							</div>
						) : (
							<Empty what="pool is empty" />
						)
					) : (
						<Unreachable what="memory" />
					)}
				</Panel>
			</div>

			<div className="mt-10 flex flex-wrap gap-x-7 gap-y-2">
				<FootLink
					href={process.env.LANGFUSE_URL ?? 'https://cloud.langfuse.com'}
					label="langfuse"
				/>
				{(process.env.TEMPORAL_UI_URL ?? process.env.NODE_ENV !== 'production') && (
					<FootLink
						href={process.env.TEMPORAL_UI_URL ?? 'http://localhost:8233'}
						label="temporal"
					/>
				)}
				{process.env.GATEWAY_URL && (
					<FootLink href={`${process.env.GATEWAY_URL}/health`} label="gateway" />
				)}
			</div>
		</div>
	)
}

function Panel({
	title,
	href,
	wide,
	children
}: {
	title: string
	href: string
	wide?: boolean
	children: React.ReactNode
}) {
	return (
		<Link
			href={href}
			className={`group border-line hover:border-ink-faint block border p-5 transition-colors duration-300 ${wide ? 'md:col-span-2' : ''}`}
		>
			<div className="flex items-baseline justify-between">
				<span className="eyebrow text-ink-faint text-[11px] tracking-[0.18em]">{title}</span>
				<span className="text-ink-faint group-hover:text-ink text-[15px] transition-all duration-[620ms] ease-(--ease-snap) group-hover:translate-x-1.5">
					→
				</span>
			</div>
			<div className="mt-4">{children}</div>
		</Link>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<span className="text-[14px]">
			<span className="text-ink-faint">{label}</span> <span className="text-ink">{value}</span>
		</span>
	)
}

function TallyLine({ tally }: { tally: { accepted: number; rejected: number; other: number } }) {
	return (
		<div className="text-[14px]">
			<span className="text-c-green">{tally.accepted}</span>
			<span className="text-ink-faint"> accepted · </span>
			<span className="text-c-red">{tally.rejected}</span>
			<span className="text-ink-faint"> rejected · </span>
			<span className="text-ink-dim">{tally.other}</span>
			<span className="text-ink-faint"> other</span>
		</div>
	)
}

function SeedLine({ tally }: { tally: { active: number; exhausted: number; dormant: number } }) {
	return (
		<p className="text-ink-faint mt-2 text-[13px]">
			seeds: {tally.active} active · {tally.exhausted} exhausted · {tally.dormant} dormant
		</p>
	)
}

function Unreachable({ what }: { what: string }) {
	return (
		<span className="border-c-red/40 text-c-red rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
			{what} unreachable
		</span>
	)
}

function Empty({ what }: { what: string }) {
	return <span className="text-ink-faint text-[14px]">{what}</span>
}

function FootLink({ href, label }: { href: string; label: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="text-c-blue relative font-mono text-[12.5px] after:absolute after:-bottom-[3px] after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
		>
			{label}
		</a>
	)
}
