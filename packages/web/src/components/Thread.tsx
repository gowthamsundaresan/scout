import { formatDate } from '../lib/digest'
import type { GatewayMessage } from '../lib/types'

export function Thread({ replies }: { replies: GatewayMessage[] }) {
	if (!replies.length) return null
	return (
		<div className="mt-3 space-y-2">
			{replies.map((reply) => (
				<div
					key={reply.messageId}
					className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm"
				>
					<div className="text-xs text-neutral-500">
						{reply.fromClientId} · {formatDate(reply.createdAt)}
					</div>
					<div className="mt-0.5 whitespace-pre-wrap text-neutral-300">
						{String(reply.payload?.text ?? '')}
					</div>
				</div>
			))}
		</div>
	)
}
