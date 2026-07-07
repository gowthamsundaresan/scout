import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
	title: 'Scout',
	description: 'Scout dashboard — digests, ops, memory'
}

const NAV = [
	{ href: '/', label: 'Digest' },
	{ href: '/ops', label: 'Ops' },
	{ href: '/memory', label: 'Memory' },
	{ href: '/decisions', label: 'Decisions' },
	{ href: '/lessons', label: 'Lessons' }
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-neutral-950 text-neutral-200 antialiased">
				<nav className="border-b border-neutral-800">
					<div className="mx-auto flex max-w-3xl items-center gap-5 px-4 py-3 text-sm">
						<span className="font-semibold tracking-tight text-neutral-100">scout</span>
						{NAV.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="text-neutral-400 transition-colors hover:text-neutral-100"
							>
								{item.label}
							</Link>
						))}
					</div>
				</nav>
				<main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
			</body>
		</html>
	)
}
