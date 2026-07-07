'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
	{ href: '/', label: 'Overview' },
	{ href: '/digest', label: 'Digest' },
	{ href: '/pipeline', label: 'Pipeline' },
	{ href: '/memory', label: 'Memory' },
	{ href: '/evals', label: 'Evals' },
	{ href: '/messages', label: 'Messages' }
]

type Loop = 'ok' | 'overdue' | 'unknown'

export function Sidebar() {
	const pathname = usePathname()
	const router = useRouter()
	const [loop, setLoop] = useState<Loop>('unknown')

	useEffect(() => {
		if (pathname === '/login') return
		fetch('/api/status')
			.then((res) => (res.ok ? res.json() : null))
			.then((s) => setLoop(s && !s.unreachable ? (s.overdue ? 'overdue' : 'ok') : 'unknown'))
			.catch(() => setLoop('unknown'))
	}, [pathname])

	if (pathname === '/login') return null

	async function logout() {
		await fetch('/api/logout', { method: 'POST' }).catch(() => {})
		router.replace('/login')
	}

	return (
		<aside className="border-line fixed inset-y-0 left-0 z-10 flex w-40 flex-col justify-between overflow-y-auto border-r px-5 py-7 md:w-52 md:px-7 md:py-9">
			<div>
				<Link href="/" className="text-ink text-lg font-medium tracking-tight">
					scout
				</Link>
				<nav className="mt-10 flex flex-col md:mt-12">
					{NAV.map((item) => {
						const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`group relative py-2.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors duration-300 ${
									active ? 'text-ink' : 'text-ink-faint hover:text-ink'
								}`}
							>
								<span
									className={`bg-ink absolute top-1.5 bottom-1.5 -left-5 w-[2px] origin-top transition-transform duration-[620ms] ease-(--ease-snap) md:-left-7 ${
										active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
									}`}
								/>
								{item.label}
							</Link>
						)
					})}
				</nav>
			</div>
			<div className="space-y-3">
				<div className="text-ink-faint flex items-center font-mono text-[10.5px] tracking-[0.1em] uppercase">
					<span
						className={`mr-2.5 inline-block h-1.5 w-1.5 rounded-full ${
							loop === 'ok'
								? 'bg-c-green animate-pulse-dot shadow-[0_0_8px_var(--color-c-green)]'
								: loop === 'overdue'
									? 'bg-c-red animate-pulse-dot shadow-[0_0_8px_var(--color-c-red)]'
									: 'bg-ink-faint'
						}`}
					/>
					6h loop
				</div>
				<button
					onClick={logout}
					className="text-ink-faint hover:text-ink cursor-pointer font-mono text-[10.5px] tracking-[0.1em] uppercase transition-colors duration-300"
				>
					logout
				</button>
			</div>
		</aside>
	)
}
