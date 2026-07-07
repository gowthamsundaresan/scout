import Link from 'next/link'

import { memoryBrowse } from '../../lib/scout'

export const dynamic = 'force-dynamic'

const NAMESPACES = ['world', 'self', 'system'] as const

export default async function MemoryPage({
	searchParams
}: {
	searchParams: Promise<{ namespace?: string; q?: string; type?: string }>
}) {
	const params = await searchParams
	const namespace = NAMESPACES.includes(params.namespace as (typeof NAMESPACES)[number])
		? (params.namespace as (typeof NAMESPACES)[number])
		: 'world'
	const { records } = await memoryBrowse(namespace, params.q, params.type)

	return (
		<div>
			<div className="flex items-center justify-between gap-4">
				<div className="flex gap-2 text-sm">
					{NAMESPACES.map((ns) => (
						<Link
							key={ns}
							href={`/memory?namespace=${ns}`}
							className={`rounded-full border border-neutral-800 px-3 py-1 ${namespace === ns ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`}
						>
							{ns}
						</Link>
					))}
				</div>
				<form action="/memory" className="flex gap-2">
					<input type="hidden" name="namespace" value={namespace} />
					<input
						name="q"
						defaultValue={params.q ?? ''}
						placeholder="Search…"
						className="w-48 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
					/>
				</form>
			</div>

			<div className="mt-5 space-y-3">
				{!records.length && (
					<p className="py-8 text-center text-sm text-neutral-500">No records.</p>
				)}
				{records.map((record) => (
					<div
						key={record.dedupeKey}
						className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
					>
						<div className="flex items-baseline justify-between gap-3">
							<span className="font-medium text-neutral-100">{record.title}</span>
							<span className="shrink-0 text-xs text-neutral-500">{record.type}</span>
						</div>
						{(record.summary ?? record.body) && (
							<p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-neutral-400">
								{String(record.summary ?? record.body)}
							</p>
						)}
						<p className="mt-2 font-mono text-xs text-neutral-600">{record.dedupeKey}</p>
					</div>
				))}
			</div>
		</div>
	)
}
