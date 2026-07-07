import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '../../components/PageHeader'
import { memoryBrowse } from '../../lib/scout'
import type { MemoryRecord } from '../../lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'memory' }

const NAMESPACES = ['world', 'self', 'system'] as const
type Namespace = (typeof NAMESPACES)[number]

const TYPES: Record<Namespace, string[]> = {
	world: ['person', 'ai-update', 'opportunity'],
	self: ['profile', 'thesis', 'ask', 'offer'],
	system: ['decision', 'lesson', 'guide', 'checkpoint']
}

const TYPE_COLOR: Record<string, string> = {
	person: 'text-c-blue',
	'ai-update': 'text-c-purple',
	opportunity: 'text-c-orange',
	profile: 'text-c-blue',
	thesis: 'text-c-yellow',
	ask: 'text-c-pink',
	offer: 'text-c-green',
	decision: 'text-c-red',
	lesson: 'text-c-yellow',
	guide: 'text-c-blue',
	checkpoint: 'text-ink-faint'
}

export default async function MemoryPage({
	searchParams
}: {
	searchParams: Promise<{ namespace?: string; q?: string; type?: string }>
}) {
	const params = await searchParams
	const namespace: Namespace = NAMESPACES.includes(params.namespace as Namespace)
		? (params.namespace as Namespace)
		: 'world'
	const type = params.type && TYPES[namespace].includes(params.type) ? params.type : undefined
	const q = params.q || undefined

	const res = await memoryBrowse(namespace, q, type).catch(() => null)
	const records = res?.records ?? null

	const link = (over: { namespace?: Namespace; type?: string | null }) => {
		const qs = new URLSearchParams()
		qs.set('namespace', over.namespace ?? namespace)
		const t = over.type === null ? undefined : (over.type ?? (over.namespace ? undefined : type))
		if (t) qs.set('type', t)
		if (q) qs.set('q', q)
		return `/memory?${qs}`
	}

	return (
		<div>
			<PageHeader
				title="Memory"
				blurb="The three supermemory namespaces — world pool, who you are, and what the system learned."
			/>

			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap gap-2">
					{NAMESPACES.map((ns) => (
						<Chip key={ns} href={link({ namespace: ns })} active={namespace === ns} label={ns} />
					))}
				</div>
				<form action="/memory" className="max-w-52 min-w-40 flex-1">
					<input type="hidden" name="namespace" value={namespace} />
					{type && <input type="hidden" name="type" value={type} />}
					<input
						name="q"
						defaultValue={q ?? ''}
						placeholder="search…"
						className="border-line text-ink placeholder:text-ink-faint focus:border-ink-faint w-full border-b bg-transparent pb-1 font-mono text-[13px] transition-colors duration-300 outline-none"
					/>
				</form>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<Chip href={link({ type: null })} active={!type} label="all" small />
				{TYPES[namespace].map((t) => (
					<Chip key={t} href={link({ type: t })} active={type === t} label={t} small />
				))}
			</div>

			<div className="mt-6">
				{records === null && (
					<span className="border-c-red/40 text-c-red rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
						memory unreachable
					</span>
				)}
				{records?.length === 0 && <p className="text-ink-faint text-[14px]">no records.</p>}
				{(records ?? []).map((record) => (
					<RecordRow key={record.dedupeKey} record={record} />
				))}
			</div>
		</div>
	)
}

function RecordRow({ record }: { record: MemoryRecord }) {
	const preview = record.summary ?? record.body
	return (
		<details className="group border-line border-b">
			<summary className="cursor-pointer list-none py-5 select-none [&::-webkit-details-marker]:hidden">
				<div className="flex items-baseline gap-3">
					<span className="text-ink-faint inline-block transition-transform duration-300 group-open:rotate-90">
						▸
					</span>
					<span className="text-ink text-[15px] font-medium tracking-[-0.015em]">
						{record.title}
					</span>
					<span
						className={`ml-auto shrink-0 font-mono text-[10.5px] tracking-[0.1em] uppercase ${TYPE_COLOR[record.type] ?? 'text-ink-faint'}`}
					>
						{record.type}
					</span>
				</div>
				{preview != null && (
					<p className="text-ink-dim mt-1.5 line-clamp-2 max-w-[64ch] pl-6 text-[14px] leading-[1.62] group-open:hidden">
						{String(preview)}
					</p>
				)}
			</summary>
			<div className="border-line bg-raised/15 mb-5 ml-6 rounded-[5px] border p-4">
				<dl className="space-y-3">
					{Object.entries(record)
						.filter(([key]) => key !== 'namespace' && key !== 'type' && key !== 'title')
						.map(([key, value]) => (
							<div key={key}>
								<dt className="eyebrow text-ink-faint text-[10px]">{key}</dt>
								<dd className="text-ink-dim mt-0.5 text-[13.5px] leading-[1.62] break-words whitespace-pre-wrap">
									{renderValue(value)}
								</dd>
							</div>
						))}
				</dl>
			</div>
		</details>
	)
}

function renderValue(value: unknown): string {
	if (value == null) return '—'
	if (typeof value === 'string') return value || '—'
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '—'
	return JSON.stringify(value, null, 2)
}

function Chip({
	href,
	active,
	label,
	small
}: {
	href: string
	active: boolean
	label: string
	small?: boolean
}) {
	return (
		<Link
			href={href}
			className={`rounded-[5px] font-mono tracking-[0.1em] uppercase transition-colors duration-300 ${
				small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11.5px]'
			} ${active ? 'bg-raised text-ink' : 'text-ink-faint hover:text-ink'}`}
		>
			{label}
		</Link>
	)
}
