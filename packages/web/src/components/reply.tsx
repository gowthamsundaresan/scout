'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// --- Helper functions ---

async function send(replyToMessageId: string, text: string): Promise<boolean> {
	const res = await fetch('/api/reply', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ replyToMessageId, text })
	})
	return res.ok
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
	const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed'>('idle')

	async function verdict(kind: 'Accept' | 'Reject') {
		setState('busy')
		// The feedback judge resolves targets by dedupeKey when present, by name otherwise
		const ref = entryKey ? `${name} (${entryKey})` : name
		const ok = await send(sectionId, `${kind}: ${ref}`)
		setState(ok ? 'sent' : 'failed')
		if (ok) router.refresh()
	}

	if (state === 'sent') return <span className="text-xs text-neutral-500">sent ✓</span>

	return (
		<div className="flex items-center gap-1.5">
			{state === 'failed' && <span className="text-xs text-red-400">failed</span>}
			<button
				onClick={() => verdict('Accept')}
				disabled={state === 'busy'}
				title="Accept"
				className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
			>
				accept
			</button>
			<button
				onClick={() => verdict('Reject')}
				disabled={state === 'busy'}
				title="Reject"
				className="rounded-md border border-red-500/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
			>
				reject
			</button>
		</div>
	)
}

export function ReplyBox({ replyToMessageId }: { replyToMessageId: string }) {
	const router = useRouter()
	const [text, setText] = useState('')
	const [busy, setBusy] = useState(false)

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		if (!text.trim()) return
		setBusy(true)
		const ok = await send(replyToMessageId, text.trim())
		if (ok) {
			setText('')
			router.refresh()
		}
		setBusy(false)
	}

	return (
		<form onSubmit={submit} className="mt-3 flex gap-2">
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Reply to this section…"
				className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
			/>
			<button
				type="submit"
				disabled={busy || !text.trim()}
				className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
			>
				{busy ? '…' : 'Send'}
			</button>
		</form>
	)
}
