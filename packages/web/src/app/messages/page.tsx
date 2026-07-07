import type { Metadata } from 'next'
import Link from 'next/link'

import { LocalTime } from '../../components/LocalTime'
import { PageHeader } from '../../components/PageHeader'
import { Thread } from '../../components/Thread'
import { ReplyBox } from '../../components/reply'
import { getThread, listMessages } from '../../lib/gateway'
import type { GatewayMessage } from '../../lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'messages' }

const STATUS_COLOR: Record<string, string> = {
	delivered: 'text-c-green',
	forwarded: 'text-c-blue',
	received: 'text-ink-dim',
	pending: 'text-c-yellow',
	failed: 'text-c-red'
}

type Params = { direction?: string; thread?: string; before?: string }

function qsFor(params: Params, over: Partial<Params>): string {
	const merged = { ...params, ...over }
	const qs = new URLSearchParams()
	if (merged.direction === 'out' || merged.direction === 'in') qs.set('direction', merged.direction)
	if (merged.before) qs.set('before', merged.before)
	if (merged.thread) qs.set('thread', merged.thread)
	const s = qs.toString()
	return s ? `/messages?${s}` : '/messages'
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Params> }) {
	const params = await searchParams
	const direction =
		params.direction === 'out' || params.direction === 'in' ? params.direction : undefined

	const [page, openThread] = await Promise.all([
		listMessages({ direction, before: params.before, limit: 30 }).catch(() => null),
		params.thread ? getThread(params.thread).catch(() => null) : Promise.resolve(null)
	])

	return (
		<div>
			<PageHeader
				title="Messages"
				blurb="Raw gateway traffic — every message in and out, with delivery status and threads."
			/>

			<div className="flex gap-2">
				<Chip
					href={qsFor(params, { direction: undefined, before: undefined, thread: undefined })}
					active={!direction}
					label="all"
				/>
				<Chip
					href={qsFor(params, { direction: 'out', before: undefined, thread: undefined })}
					active={direction === 'out'}
					label="out"
				/>
				<Chip
					href={qsFor(params, { direction: 'in', before: undefined, thread: undefined })}
					active={direction === 'in'}
					label="in"
				/>
			</div>

			<div className="mt-6">
				{!page && (
					<span className="border-c-red/40 text-c-red rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
						gateway unreachable
					</span>
				)}
				{page?.messages.length === 0 && <p className="text-ink-faint text-[14px]">no messages.</p>}
				{(page?.messages ?? []).map((message) => (
					<Row
						key={message.messageId}
						message={message}
						params={params}
						open={params.thread === message.messageId}
						openThread={params.thread === message.messageId ? openThread : null}
					/>
				))}
			</div>

			<div className="mt-8 flex gap-6">
				{params.before && (
					<Link
						href={qsFor(params, { before: undefined, thread: undefined })}
						className="text-ink-faint hover:text-ink font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-300"
					>
						← latest
					</Link>
				)}
				{page?.nextCursor && (
					<Link
						href={qsFor(params, { before: page.nextCursor, thread: undefined })}
						className="text-ink-faint hover:text-ink font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-300"
					>
						older →
					</Link>
				)}
			</div>
		</div>
	)
}

function Row({
	message,
	params,
	open,
	openThread
}: {
	message: GatewayMessage
	params: Params
	open: boolean
	openThread: { message: GatewayMessage; replies: GatewayMessage[] } | null
}) {
	const toggleHref = qsFor(params, { thread: open ? undefined : message.messageId })
	return (
		<div className="border-line border-b py-3.5">
			<Link href={toggleHref} className="group flex flex-wrap items-baseline gap-x-4 gap-y-1">
				<span className="text-ink-faint w-7 font-mono text-[11px]">
					{message.direction === 'out' ? '↑' : '↓'}
				</span>
				<span className="text-ink-dim group-hover:text-ink max-w-[34ch] truncate font-mono text-[12px] transition-colors duration-300">
					{message.messageId}
				</span>
				<span className="text-ink-faint max-w-[24ch] truncate text-[12.5px]">
					{message.fromClientId}
					{message.receiverIds.length > 0 && ` → ${message.receiverIds.join(', ')}`}
				</span>
				<span
					className={`ml-auto font-mono text-[10.5px] tracking-[0.1em] uppercase ${STATUS_COLOR[message.status] ?? 'text-ink-dim'}`}
				>
					{message.status}
				</span>
				<span className="text-ink-faint font-mono text-[11px]">
					<LocalTime iso={message.createdAt} />
				</span>
			</Link>
			{open && !openThread && (
				<p className="text-ink-faint mt-3 pl-11 font-mono text-[11px] uppercase">
					thread unavailable
				</p>
			)}
			{open && openThread && (
				<div className="mt-3 pl-11">
					<p className="text-ink-dim max-w-[70ch] text-[13.5px] leading-[1.6] whitespace-pre-wrap">
						{String(
							openThread.message.payload?.rendered?.body ?? openThread.message.payload?.text ?? ''
						)}
					</p>
					<Thread replies={openThread.replies} />
					{message.direction === 'out' && <ReplyBox replyToMessageId={message.messageId} />}
				</div>
			)}
		</div>
	)
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
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
