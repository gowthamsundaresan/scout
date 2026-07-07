import { NextResponse } from 'next/server'

import { groupRuns } from '../../../lib/digest'
import { listMessages } from '../../../lib/gateway'

const CADENCE_HOURS = 6

export async function GET() {
	try {
		const { messages } = await listMessages({ fromClientId: 'ceo', direction: 'out', limit: 8 })
		const last = groupRuns(messages)[0]?.createdAt ?? null
		const overdue = last
			? (Date.now() - new Date(last).getTime()) / 3_600_000 > CADENCE_HOURS + 0.5
			: false
		return NextResponse.json({ lastRunAt: last, overdue })
	} catch {
		return NextResponse.json({ lastRunAt: null, overdue: false, unreachable: true })
	}
}
