import { EntryCard } from '../components/EntryCard'
import { IntentBadge } from '../components/IntentBadge'
import { Thread } from '../components/Thread'
import { ReplyBox } from '../components/reply'
import { type DigestRun, cardsOf, formatDate, groupRuns } from '../lib/digest'
import { getThread, listMessages } from '../lib/gateway'
import type { GatewayMessage } from '../lib/types'

export const dynamic = 'force-dynamic'

export default async function DigestFeed() {
	const { messages } = await listMessages({ fromClientId: 'ceo', direction: 'out', limit: 40 })
	const runs = groupRuns(messages)

	if (!runs.length) {
		return <p className="py-12 text-center text-sm text-neutral-500">No digests yet.</p>
	}

	const [latest, ...older] = runs
	const threads = await Promise.all(latest.sections.map((s) => getThread(s.message.messageId)))
	const repliesBySection = new Map(threads.map((t) => [t.message.messageId, t.replies]))

	return (
		<div className="space-y-10">
			<RunView run={latest} repliesBySection={repliesBySection} />
			{older.map((run) => (
				<details key={run.runId} className="group">
					<summary className="cursor-pointer list-none text-sm text-neutral-500 hover:text-neutral-300">
						<span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
						Digest · {formatDate(run.createdAt)}
					</summary>
					<div className="mt-4">
						<RunView run={run} />
					</div>
				</details>
			))}
		</div>
	)
}

function RunView({
	run,
	repliesBySection
}: {
	run: DigestRun
	repliesBySection?: Map<string, GatewayMessage[]>
}) {
	return (
		<section>
			<h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
				Digest · {formatDate(run.createdAt)}
			</h2>
			<div className="mt-4 space-y-8">
				{run.sections.map(({ slug, message }) => (
					<SectionView
						key={slug}
						message={message}
						replies={repliesBySection?.get(message.messageId)}
					/>
				))}
			</div>
		</section>
	)
}

function SectionView({
	message,
	replies
}: {
	message: GatewayMessage
	replies?: GatewayMessage[]
}) {
	const cards = cardsOf(message)
	const title = message.payload.rendered?.title ?? message.messageId

	return (
		<div>
			<div className="flex items-center gap-2">
				<h3 className="font-medium text-neutral-100">{title}</h3>
				<IntentBadge intent={message.intent} />
			</div>
			{cards ? (
				<div className="mt-3 space-y-3">
					{cards.headline && <p className="text-sm italic text-neutral-400">{cards.headline}</p>}
					{cards.entries.map((entry, i) => (
						<EntryCard
							key={entry.key ?? `${entry.name}-${i}`}
							entry={entry}
							sectionId={message.messageId}
						/>
					))}
				</div>
			) : (
				// Pre-cards messages only carry the rendered markdown body
				<pre className="mt-3 whitespace-pre-wrap rounded-xl border border-neutral-800 bg-neutral-900 p-4 font-sans text-sm leading-relaxed text-neutral-300">
					{message.payload.rendered?.body}
				</pre>
			)}
			{replies && <Thread replies={replies} />}
			{replies && <ReplyBox replyToMessageId={message.messageId} />}
		</div>
	)
}
