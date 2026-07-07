'use client'

import { useEffect, useRef } from 'react'

export function Reveal({
	children,
	className = ''
}: {
	children: React.ReactNode
	className?: string
}) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		// threshold 0 (not a ratio): sections taller than the viewport can never hit a high
		// intersection ratio and would stay invisible forever
		const io = new IntersectionObserver(
			(entries) =>
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('in')
						io.unobserve(entry.target)
					}
				}),
			{ threshold: 0, rootMargin: '0px 0px -8% 0px' }
		)
		io.observe(el)
		return () => io.disconnect()
	}, [])

	return (
		<div ref={ref} className={`reveal ${className}`}>
			{children}
		</div>
	)
}
