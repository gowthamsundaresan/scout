import { opsLessons } from '../../lib/scout'

export const dynamic = 'force-dynamic'

export default async function LessonsPage({
	searchParams
}: {
	searchParams: Promise<{ q?: string }>
}) {
	const { q } = await searchParams
	const { lessons } = await opsLessons(q)

	return (
		<div>
			<form action="/lessons">
				<input
					name="q"
					defaultValue={q ?? ''}
					placeholder="Search lessons…"
					className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
				/>
			</form>
			<div className="mt-5 space-y-3">
				{!lessons.length && (
					<p className="py-8 text-center text-sm text-neutral-500">No lessons yet.</p>
				)}
				{lessons.map((lesson) => (
					<div
						key={lesson.dedupeKey}
						className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
					>
						<p className="text-xs text-neutral-500">{lesson.title}</p>
						<p className="mt-1 text-sm leading-relaxed text-neutral-200">{lesson.body}</p>
					</div>
				))}
			</div>
		</div>
	)
}
