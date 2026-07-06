import { describe, expect, it } from 'vitest'

import { type ComposeOutput, isEmpty, renderDigest } from '../src/ceo/digest'

const full: ComposeOutput = {
	recommend: {
		headline: 'This cycle',
		people: [
			{
				name: 'Jane',
				handle: '@jane',
				why: 'ships infra',
				message: 'saw your engine',
				pitch: 'FDE'
			}
		]
	},
	updates: [{ title: 'GPT-6', why: 'big jump' }],
	antiRecommend: { people: [{ name: 'Bob', why: 'off-thesis' }] }
}

const empty: ComposeOutput = {
	recommend: { headline: '', people: [] },
	updates: [],
	antiRecommend: { people: [] }
}

describe('renderDigest', () => {
	it('renders both sections with people, messages and updates', () => {
		const d = renderDigest(full)
		expect(d.recommend.body).toContain('**Jane** (@jane)')
		expect(d.recommend.body).toContain('↳ Message: saw your engine')
		expect(d.recommend.body).toContain('**GPT-6**')
		expect(d.antiRecommend.body).toContain('**Bob** — off-thesis')
		expect(isEmpty(d)).toEqual({ recommend: false, antiRecommend: false })
	})

	it('marks empty sections so the workflow can skip a send', () => {
		const d = renderDigest(empty)
		expect(d.recommend.body).toBe('')
		expect(isEmpty(d)).toEqual({ recommend: true, antiRecommend: true })
	})
})
