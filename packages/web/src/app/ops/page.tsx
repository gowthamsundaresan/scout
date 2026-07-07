import Link from 'next/link'

import { formatDate } from '../../lib/digest'
import { opsJobs, opsSeeds } from '../../lib/scout'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
	done: 'text-emerald-400',
	queued: 'text-neutral-400',
	processing: 'text-sky-400',
	failed: 'text-red-400'
}

export default async function OpsPage({
	searchParams
}: {
	searchParams: Promise<{ status?: string; source?: string }>
}) {
	const { status, source } = await searchParams
	const [{ counts, jobs }, { seeds }] = await Promise.all([opsJobs({ status, source }), opsSeeds()])

	return (
		<div className="space-y-10">
			<section>
				<h2 className="font-medium text-neutral-100">Ingest jobs</h2>
				<div className="mt-3 flex flex-wrap gap-2 text-sm">
					<Link
						href="/ops"
						className={`rounded-full border border-neutral-800 px-3 py-1 ${!status ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`}
					>
						all
					</Link>
					{Object.entries(counts).map(([s, n]) => (
						<Link
							key={s}
							href={`/ops?status=${s}`}
							className={`rounded-full border border-neutral-800 px-3 py-1 ${status === s ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`}
						>
							{s} <span className={STATUS_COLOR[s] ?? ''}>{n}</span>
						</Link>
					))}
				</div>
				<div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
					<table className="w-full text-left text-sm">
						<thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
							<tr>
								<th className="px-3 py-2">source</th>
								<th className="px-3 py-2">status</th>
								<th className="px-3 py-2">attempts</th>
								<th className="px-3 py-2">written</th>
								<th className="px-3 py-2">updated</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-800/60">
							{jobs.map((job) => (
								<tr key={job._id}>
									<td className="px-3 py-2 text-neutral-300">{job.source}</td>
									<td className={`px-3 py-2 ${STATUS_COLOR[job.status] ?? 'text-neutral-300'}`}>
										{job.status}
										{job.error && (
											<div
												className="mt-0.5 max-w-xs truncate text-xs text-red-400/70"
												title={job.error}
											>
												{job.error}
											</div>
										)}
									</td>
									<td className="px-3 py-2 text-neutral-400">{job.attempts}</td>
									<td className="px-3 py-2 text-neutral-400">{job.written.length}</td>
									<td className="px-3 py-2 text-neutral-500">{formatDate(job.updatedAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			<section>
				<h2 className="font-medium text-neutral-100">Search seeds</h2>
				<div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
					<table className="w-full text-left text-sm">
						<thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
							<tr>
								<th className="px-3 py-2">kind</th>
								<th className="px-3 py-2">query</th>
								<th className="px-3 py-2">seen</th>
								<th className="px-3 py-2">state</th>
								<th className="px-3 py-2">last search</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-800/60">
							{seeds.map((seed) => (
								<tr key={seed.key}>
									<td className="px-3 py-2 text-neutral-400">{seed.kind}</td>
									<td className="max-w-sm truncate px-3 py-2 text-neutral-300" title={seed.query}>
										{seed.query}
									</td>
									<td className="px-3 py-2 text-neutral-400">{seed.totalSeen}</td>
									<td className="px-3 py-2 text-neutral-400">
										{seed.dormant ? 'dormant' : seed.exhausted ? 'exhausted' : 'active'}
									</td>
									<td className="px-3 py-2 text-neutral-500">
										{seed.lastSearchAt ? formatDate(seed.lastSearchAt) : '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
