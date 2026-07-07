import type { GatewayMessage } from '../lib/types'
import { LocalTime } from './LocalTime'

export function Thread({ replies }: { replies: GatewayMessage[] }) {
	if (!replies.length) return null
	return (
		<div className="border-line mt-4 space-y-3 border-l pl-4">
			{replies.map((reply) => (
				<div key={reply.messageId}>
					<div className="eyebrow text-ink-faint text-[10px]">
						{reply.fromClientId} · <LocalTime iso={reply.createdAt} />
					</div>
					<div className="text-ink-dim mt-1 text-[14px] leading-[1.62] whitespace-pre-wrap">
						{String(reply.payload?.text ?? '')}
					</div>
				</div>
			))}
		</div>
	)
}
