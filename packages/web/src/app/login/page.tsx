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
		<div className="flex min-h-[60vh] items-center justify-center">
			<form onSubmit={submit} className="w-full max-w-xs space-y-3">
				<h1 className="text-lg font-semibold text-neutral-100">Scout</h1>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Password"
					autoFocus
					className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
				/>
				{error && <p className="text-sm text-red-400">Wrong password.</p>}
				<button
					type="submit"
					disabled={busy || !password}
					className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
				>
					{busy ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
		</div>
	)
}
