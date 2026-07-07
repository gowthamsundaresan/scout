import type { Metadata } from 'next'
import Link from 'next/link'

import { LocalTime } from '../../components/LocalTime'
import { PageHeader } from '../../components/PageHeader'
import { Reveal } from '../../components/Reveal'
import { opsJobs, opsSeeds } from '../../lib/scout'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'pipeline' }

const STATUS_COLOR: Record<string, string> = {
	done: 'text-c-green',
	queued: 'text-ink-faint',
	processing: 'text-c-blue',
	failed: 'text-c-red'
}

export default async function PipelinePage({
	searchParams
}: {
	searchParams: Promise<{ status?: string }>
}) {
	const { status } = await searchParams
	const [jobsRes, seedsRes] = await Promise.all([
		opsJobs({ status }).catch(() => null),
		opsSeeds().catch(() => null)
	])

	return (
		<div className="space-y-14">
			<PageHeader
				title="Pipeline"
				blurb="The ingest spine — jobs flowing into memory, and the seeds that go looking."
			/>

			<section className="!mt-0">
				<h2 className="sec-label">Ingest jobs</h2>
				{!jobsRes ? (
					<Unreachable />
				) : (
					<>
						<div className="mt-5 flex flex-wrap gap-2">
							<Chip href="/pipeline" active={!status} label="all" />
							{Object.entries(jobsRes.counts).map(([s, n]) => (
								<Chip
									key={s}
									href={`/pipeline?status=${s}`}
									active={status === s}
									label={
										<>
											{s} <span className={STATUS_COLOR[s] ?? ''}>{n}</span>
										</>
									}
								/>
							))}
						</div>
						<div className="mt-2">
							{jobsRes.jobs.map((job) => (
								<div
									key={job._id}
									className="border-line flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b py-3.5"
								>
									<span className="text-ink-dim w-24 font-mono text-[12px]">{job.source}</span>
									<span
										className={`font-mono text-[11px] tracking-[0.1em] uppercase ${STATUS_COLOR[job.status] ?? 'text-ink-dim'}`}
									>
										{job.status}
									</span>
									<span className="text-ink-faint text-[12.5px]">
										{job.written.length} written · {job.attempts} attempts
									</span>
									<span className="text-ink-faint ml-auto font-mono text-[11px]">
										<LocalTime iso={job.updatedAt} />
									</span>
									{job.error && (
										<p className="text-c-red/80 w-full truncate text-[12px]" title={job.error}>
											{job.error}
										</p>
									)}
								</div>
							))}
							{!jobsRes.jobs.length && (
								<p className="text-ink-faint mt-6 text-[14px]">no jobs match.</p>
							)}
						</div>
					</>
				)}
			</section>

			<Reveal>
				<section>
					<h2 className="sec-label">Search seeds</h2>
					{!seedsRes ? (
						<Unreachable />
					) : (
						<div className="mt-2">
							{seedsRes.seeds.map((seed) => (
								<div
									key={seed.key}
									className="border-line flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b py-3.5"
								>
									<span className="text-ink-faint w-24 font-mono text-[11px] uppercase">
										{seed.kind}
									</span>
									<span
										className="text-ink-dim max-w-[42ch] truncate text-[14px]"
										title={seed.query}
									>
										{seed.query}
									</span>
									<span className="text-ink-faint ml-auto text-[12.5px]">
										{seed.totalSeen} seen ·{' '}
										<span
											className={
												seed.dormant
													? 'text-c-yellow'
													: seed.exhausted
														? 'text-ink-faint'
														: 'text-c-green'
											}
										>
											{seed.dormant ? 'dormant' : seed.exhausted ? 'exhausted' : 'active'}
										</span>
									</span>
								</div>
							))}
							{!seedsRes.seeds.length && (
								<p className="text-ink-faint mt-6 text-[14px]">no seeds.</p>
							)}
						</div>
					)}
				</section>
			</Reveal>
		</div>
	)
}

function Unreachable() {
	return (
		<span className="border-c-red/40 text-c-red mt-5 inline-block rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
			scout api unreachable
		</span>
	)
}

function Chip({ href, active, label }: { href: string; active: boolean; label: React.ReactNode }) {
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
