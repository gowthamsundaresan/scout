import { describe, expect, it } from 'vitest'

import type { AiUpdateRecord, PersonRecord } from '@scout/memory'

import {
	type ComposeOutput,
	buildCards,
	isEmpty,
	pingSummary,
	renderDigest
} from '../src/ceo/digest'
import type { Selected } from '../src/ceo/prompts'

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

const jane: PersonRecord = {
	namespace: 'world',
	type: 'person',
	dedupeKey: 'world/person/jane',
	title: 'Jane',
	summary: 'ships infra',
	tags: [],
	salience: 0.9,
	source: { name: 'x', url: 'https://x.com/jane', fetchedAt: '2026-01-01' },
	handle: '@jane',
	whyInteresting: 'ships infra'
}

const gpt6: AiUpdateRecord = {
	namespace: 'world',
	type: 'ai-update',
	dedupeKey: 'world/ai-update/gpt-6',
	title: 'GPT-6',
	summary: 'big jump',
	tags: [],
	salience: 0.8,
	source: { name: 'blog', url: '', fetchedAt: '2026-01-01' },
	whatHappened: 'released',
	whyItMatters: 'big jump'
}

const selected: Selected = {
	peopleRecommend: [jane],
	peopleAntiRecommend: [],
	updatesRecommend: [gpt6],
	updatesAntiRecommend: []
}

describe('buildCards', () => {
	it('resolves an echoed key and enriches with url + handle', () => {
		const withKey: ComposeOutput = {
			...full,
			people: {
				...full.people,
				recommend: {
					headline: 'This cycle',
					entries: [
						{ ...full.people.recommend.entries[0], key: 'world/person/jane', handle: undefined }
					]
				}
			}
		}
		const cards = buildCards(withKey, selected)
		const card = cards.peopleRecommend.entries[0]
		expect(card.key).toBe('world/person/jane')
		expect(card.url).toBe('https://x.com/jane')
		expect(card.handle).toBe('@jane')
		expect(card.kind).toBe('person')
		expect(card.message).toBe('saw your engine')
	})

	it('falls back to a case-insensitive name match when the key is missing', () => {
		const cards = buildCards(full, selected)
		expect(cards.peopleRecommend.entries[0].key).toBe('world/person/jane')
		expect(cards.updatesRecommend.entries[0].key).toBe('world/ai-update/gpt-6')
		// an empty source url must not become url: ''
		expect(cards.updatesRecommend.entries[0].url).toBeUndefined()
	})

	it('drops a hallucinated key that resolves to no record', () => {
		const bad: ComposeOutput = {
			...full,
			people: {
				...full.people,
				antiRecommend: { entries: [{ key: 'world/person/nope', name: 'Bob', why: 'off-thesis' }] }
			}
		}
		const cards = buildCards(bad, selected)
		expect(cards.peopleAntiRecommend.entries[0].key).toBeUndefined()
		expect(cards.peopleAntiRecommend.entries[0].name).toBe('Bob')
	})
})

describe('pingSummary', () => {
	it('counts recommend-bucket entries only', () => {
		expect(pingSummary(buildCards(full, selected))).toBe('1 people · 1 updates')
		expect(pingSummary(buildCards(empty, selected))).toBe('0 people · 0 updates')
	})
})
