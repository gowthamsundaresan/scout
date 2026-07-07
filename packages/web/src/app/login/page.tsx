'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [error, setError] = useState(false)
	const [busy, setBusy] = useState(false)

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		setBusy(true)
		setError(false)
		const res = await fetch('/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password })
		})
		if (res.ok) {
			router.replace('/')
			router.refresh()
		} else {
			setError(true)
			setBusy(false)
		}
	}

	return (
		// Fixed overlay: covers the sidebar gutter so the form is truly centered
		<div className="bg-bg fixed inset-0 z-20 flex items-center justify-center px-6">
			<form onSubmit={submit} className="w-full max-w-xs">
				<p className="eyebrow text-ink-faint rise">scout</p>
				<h1
					className="text-ink rise mt-3 text-[clamp(24px,4vw,30px)] tracking-[-0.02em]"
					style={{ animationDelay: '0.1s' }}
				>
					Welcome back.
				</h1>
				<div className="rise mt-8" style={{ animationDelay: '0.2s' }}>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="password"
						autoFocus
						className="border-line text-ink placeholder:text-ink-faint focus:border-ink w-full border-b bg-transparent pb-2 font-mono text-[14px] transition-colors duration-300 outline-none"
					/>
					{error && (
						<p className="text-c-red mt-3 font-mono text-[11px] uppercase">wrong password</p>
					)}
					<button
						type="submit"
						disabled={busy || !password}
						className="bg-ink text-bg mt-6 w-full rounded-[3px] py-2.5 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
					>
						{busy ? '…' : 'enter'}
					</button>
				</div>
			</form>
		</div>
	)
}
