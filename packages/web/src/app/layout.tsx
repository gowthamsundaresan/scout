import type { Metadata } from 'next'
import localFont from 'next/font/local'

import { Sidebar } from '../components/Sidebar'
import './globals.css'

const neue = localFont({
	src: [
		{ path: '../fonts/NeueMontreal-Light.otf', weight: '300' },
		{ path: '../fonts/NeueMontreal-Regular.otf', weight: '400' },
		{ path: '../fonts/NeueMontreal-Medium.otf', weight: '500' },
		{ path: '../fonts/NeueMontreal-Bold.otf', weight: '700' }
	],
	variable: '--font-neue'
})

export const metadata: Metadata = {
	title: { default: 'scout', template: '%s · scout' },
	description: 'Scout dashboard — digests, pipeline, memory, evals'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={`${neue.variable} bg-bg text-ink-dim min-h-screen font-sans antialiased`}>
				<div className="noise" />
				<Sidebar />
				<div className="pl-40 md:pl-52">
					<main className="relative z-[2] mx-auto w-full max-w-[760px] px-6 py-10 md:py-14">
						{children}
					</main>
				</div>
			</body>
		</html>
	)
}
