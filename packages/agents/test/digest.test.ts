import { describe, expect, it } from 'vitest'

import { type ComposeOutput, isEmpty, renderDigest } from '../src/ceo/digest'

const full: ComposeOutput = {
	people: {
		recommend: {
			headline: 'This cycle',
			entries: [
				{
					name: 'Jane',
					handle: '@jane',
					why: 'ships infra',
					message: 'saw your engine',
					pitch: 'FDE'
				}
			]
		},
		antiRecommend: { entries: [{ name: 'Bob', why: 'off-thesis' }] }
	},
	updates: {
		recommend: { headline: 'Shipped', entries: [{ title: 'GPT-6', why: 'big jump' }] },
		antiRecommend: { entries: [{ title: 'AGI thinkpiece', why: 'hype, no substance' }] }
	}
}

const empty: ComposeOutput = {
	people: { recommend: { headline: '', entries: [] }, antiRecommend: { entries: [] } },
	updates: { recommend: { headline: '', entries: [] }, antiRecommend: { entries: [] } }
}

describe('renderDigest', () => {
	it('renders four independent sections', () => {
		const d = renderDigest(full)
		expect(d.peopleRecommend.body).toContain('**Jane** (@jane)')
		expect(d.peopleRecommend.body).toContain('↳ Message: saw your engine')
		expect(d.peopleAntiRecommend.body).toContain('**Bob** — off-thesis')
		expect(d.updatesRecommend.body).toContain('**GPT-6** — big jump')
		expect(d.updatesAntiRecommend.body).toContain('**AGI thinkpiece** — hype, no substance')
		// people and AI news are fully separate — the people digest carries no update lines
		expect(d.peopleRecommend.body).not.toContain('GPT-6')
		expect(isEmpty(d)).toEqual({
			peopleRecommend: false,
			peopleAntiRecommend: false,
			updatesRecommend: false,
			updatesAntiRecommend: false
		})
	})

	it('marks empty sections so the workflow skips those sends', () => {
		const d = renderDigest(empty)
		expect(d.updatesRecommend.body).toBe('')
		expect(isEmpty(d)).toEqual({
			peopleRecommend: true,
			peopleAntiRecommend: true,
			updatesRecommend: true,
			updatesAntiRecommend: true
		})
	})
})
