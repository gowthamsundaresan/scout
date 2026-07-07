'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// --- Types & state ---

type SendResult = 'ok' | 'auth' | 'error'

const MICRO =
	'rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-40 cursor-pointer'

// --- Helper functions ---

async function send(replyToMessageId: string, text: string): Promise<SendResult> {
	try {
		const res = await fetch('/api/reply', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ replyToMessageId, text })
		})
		if (res.ok) return 'ok'
		return res.status === 401 ? 'auth' : 'error'
	} catch {
		return 'error'
	}
}

// --- Core functions ---

export function CardActions({
	sectionId,
	name,
	entryKey
}: {
	sectionId: string
	name: string
	entryKey?: string
}) {
	const router = useRouter()
	const [state, setState] = useState<'idle' | 'busy' | 'sent' | SendResult>('idle')

	async function verdict(kind: 'Accept' | 'Reject') {
		setState('busy')
		// The feedback judge resolves targets by dedupeKey when present, by name otherwise
		const ref = entryKey ? `${name} (${entryKey})` : name
		const result = await send(sectionId, `${kind}: ${ref}`)
		setState(result === 'ok' ? 'sent' : result)
		if (result === 'ok') router.refresh()
	}

	if (state === 'sent') {
		return (
			<span className="text-c-green font-mono text-[10px] tracking-[0.1em] uppercase">sent</span>
		)
	}

	return (
		<span className="flex items-center gap-1.5">
			{state === 'auth' && (
				<span className="text-c-red font-mono text-[10px] uppercase">session expired — reload</span>
			)}
			{state === 'error' && (
				<span className="text-c-red font-mono text-[10px] uppercase">failed</span>
			)}
			<button
				onClick={() => verdict('Accept')}
				disabled={state === 'busy'}
				className={`${MICRO} border-c-green/40 text-c-green hover:bg-c-green/10`}
			>
				accept
			</button>
			<button
				onClick={() => verdict('Reject')}
				disabled={state === 'busy'}
				className={`${MICRO} border-c-red/40 text-c-red hover:bg-c-red/10`}
			>
				reject
			</button>
		</span>
	)
}

export function ReplyBox({ replyToMessageId }: { replyToMessageId: string }) {
	const router = useRouter()
	const [text, setText] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<'auth' | 'error' | null>(null)

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		if (!text.trim()) return
		setBusy(true)
		setError(null)
		try {
			const result = await send(replyToMessageId, text.trim())
			if (result === 'ok') {
				setText('')
				router.refresh()
			} else {
				setError(result)
			}
		} finally {
			setBusy(false)
		}
	}

	return (
		<form onSubmit={submit} className="mt-4">
			<div className="flex items-baseline gap-3">
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="reply to this section…"
					className="border-line text-ink placeholder:text-ink-faint focus:border-ink-faint flex-1 border-b bg-transparent pb-1.5 font-mono text-[13px] transition-colors duration-300 outline-none"
				/>
				<button
					type="submit"
					disabled={busy || !text.trim()}
					className="text-ink-faint hover:text-ink cursor-pointer font-mono text-[10.5px] tracking-[0.1em] uppercase transition-colors duration-300 disabled:opacity-40"
				>
					{busy ? '…' : 'send'}
				</button>
			</div>
			{error && (
				<p className="text-c-red mt-2 font-mono text-[10px] tracking-[0.1em] uppercase">
					{error === 'auth' ? 'session expired — reload the page' : 'send failed — try again'}
				</p>
			)}
		</form>
	)
}
