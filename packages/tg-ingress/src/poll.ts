import type { ReceiveBody } from './gateway'

// --- Types & state ---

export type TgMessage = {
	message_id: number
	chat: { id: number }
	text?: string
	reply_to_message?: { text?: string }
}

export type TgUpdate = { update_id: number; message?: TgMessage }

const REF_PATTERN = /·ref:(\S+)/

// --- Core functions ---

// A usable reply must be in the configured chat, reply to a message carrying a ·ref footer,
// and have text of its own; everything else is skipped (returns null).
export function parseReply(update: TgUpdate, chatId: string): ReceiveBody | null {
	const msg = update.message
	if (!msg?.text || String(msg.chat.id) !== chatId) return null
	const repliedText = msg.reply_to_message?.text
	const ref = repliedText?.match(REF_PATTERN)
	if (!ref) return null
	return {
		messageId: `tg-${msg.chat.id}-${msg.message_id}`,
		replyToMessageId: ref[1],
		payload: { text: msg.text, repliedText }
	}
}
