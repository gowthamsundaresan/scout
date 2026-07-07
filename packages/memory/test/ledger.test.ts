import { describe, expect, it } from 'vitest'

import { checkpointToLedger, ledgerToCheckpoint } from '../src/ledger'
import { rehydrate, render } from '../src/render'
import type { DigestLedger, SystemRecord } from '../src/types'

const ledger: DigestLedger = {
	runId: 'run-abc',
	sections: [
		{
			messageId: 'run-abc-people-0',
			slug: 'people-0',
			intent: 0,
			title: 'Scout — people to reach out to',
			body: '• **jane** — ships fast',
			targets: [{ dedupeKey: 'world/person/jane', name: 'jane', type: 'person', facts: 'ships' }]
		}
	]
}

describe('digest ledger', () => {
	it('round-trips through checkpoint record + supermemory render/rehydrate', () => {
		const checkpoint = ledgerToCheckpoint(ledger)
		expect(checkpoint.dedupeKey).toBe('system/digest/run-abc')

		const derived = render(checkpoint)
		// The JSON blob travels in metadata only; content stays out of the embedding/summary path.
		expect(derived.content).toBe(checkpoint.title)

		const back = rehydrate(derived.metadata)
		expect(back).not.toBeNull()
		expect(checkpointToLedger(back as SystemRecord)).toEqual(ledger)
	})

	it('returns null for malformed bodies and non-checkpoint records', () => {
		const checkpoint = ledgerToCheckpoint(ledger)
		expect(checkpointToLedger({ ...checkpoint, body: 'not json' })).toBeNull()
		expect(checkpointToLedger({ ...checkpoint, body: JSON.stringify({ runId: 'x' }) })).toBeNull()
		expect(
			checkpointToLedger({ ...checkpoint, type: 'lesson', body: JSON.stringify(ledger) })
		).toBeNull()
	})
})
