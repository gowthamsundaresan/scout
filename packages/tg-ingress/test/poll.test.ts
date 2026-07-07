import { describe, expect, it } from 'vitest'

import { type TgUpdate, parseReply } from '../src/poll'

const reply = (over: Partial<TgUpdate['message'] & object> = {}): TgUpdate => ({
	update_id: 1,
	message: {
		message_id: 42,
		chat: { id: 777 },
		text: 'not interested — too early-stage',
		reply_to_message: { text: '*Scout*\n\n• jane\n\n·ref:run-abc-people-0' },
		...over
	}
})

describe('parseReply', () => {
	it('extracts the ref and builds the receive body', () => {
		const body = parseReply(reply(), '777')
		expect(body).toEqual({
			messageId: 'tg-777-42',
			replyToMessageId: 'run-abc-people-0',
			payload: {
				text: 'not interested — too early-stage',
				repliedText: '*Scout*\n\n• jane\n\n·ref:run-abc-people-0'
			}
		})
	})

	it('skips foreign chats, non-replies, and replies without a ref', () => {
		expect(parseReply(reply(), '888')).toBeNull()
		expect(parseReply(reply({ reply_to_message: undefined }), '777')).toBeNull()
		expect(parseReply(reply({ reply_to_message: { text: 'plain message' } }), '777')).toBeNull()
		expect(parseReply({ update_id: 1 }, '777')).toBeNull()
	})
})
