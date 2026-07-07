import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'

import { complete, safeJson } from '@scout/llm'
import type {
	AiUpdateRecord,
	PersonRecord,
	SelfRecord,
	SystemNoteRecord,
	SystemRecord,
	WorldRecord
} from '@scout/memory'

import {
	type ComposeOutput,
	type Digest,
	type DigestCards,
	EMPTY_COMPOSE,
	buildCards,
	composeSchema,
	renderDigest
} from './digest'
import { modelFor } from './models'
import { COMPOSE_SYSTEM, RANK_SYSTEM, type Selected, composePrompt, rankPrompt } from './prompts'

// --- Types & state ---

const selectionSchema = z.object({ dedupeKey: z.string().min(1), reason: z.string() })
const bucketPairSchema = z.object({
	recommend: z.array(selectionSchema),
	antiRecommend: z.array(selectionSchema)
})

export const rankSchema = z.object({
	people: bucketPairSchema,
	updates: bucketPairSchema
})

export type RankOutput = z.infer<typeof rankSchema>

export type CeoContext = {
	self: SelfRecord[]
	world: WorldRecord[]
	system: SystemRecord[]
	lessons: SystemNoteRecord[]
}
export type CeoResult = {
	digest: Digest
	cards: DigestCards
	ranking: RankOutput
	compose: ComposeOutput
}

const EMPTY_RANK: RankOutput = {
	people: { recommend: [], antiRecommend: [] },
	updates: { recommend: [], antiRecommend: [] }
}

const CeoState = Annotation.Root({
	self: Annotation<SelfRecord[]>(),
	world: Annotation<WorldRecord[]>(),
	system: Annotation<SystemRecord[]>(),
	lessons: Annotation<SystemNoteRecord[]>(),
	traceId: Annotation<string>(),
	ranking: Annotation<RankOutput>(),
	compose: Annotation<ComposeOutput>()
})

type State = typeof CeoState.State

// --- Core functions ---

export async function runCeoGraph(ctx: CeoContext, traceId: string): Promise<CeoResult> {
	const graph = buildGraph()
	const res = await graph.invoke({
		self: ctx.self,
		world: ctx.world,
		system: ctx.system,
		lessons: ctx.lessons,
		traceId
	})
	const compose = res.compose ?? EMPTY_COMPOSE
	const ranking = res.ranking ?? EMPTY_RANK
	return {
		digest: renderDigest(compose),
		cards: buildCards(compose, selectRecords(ranking, ctx.world)),
		ranking,
		compose
	}
}

export function buildGraph() {
	// Node names must not collide with state channels ('ranking'/'compose'), so suffix them.
	return new StateGraph(CeoState)
		.addNode('rankNode', rankNode)
		.addNode('composeNode', composeNode)
		.addEdge(START, 'rankNode')
		.addEdge('rankNode', 'composeNode')
		.addEdge('composeNode', END)
		.compile()
}

// --- Helper functions ---

async function rankNode(state: State): Promise<Partial<State>> {
	const decided = decidedKeys(state.system)
	const pool = state.world.map((w) => ({
		dedupeKey: w.dedupeKey,
		type: w.type,
		title: w.title,
		summary: w.summary,
		salience: w.salience
	}))
	const user = rankPrompt(state.self, pool, decided, state.lessons)
	const content = await complete(
		{ name: 'ceo-rank', model: modelFor('ceo-rank'), traceId: state.traceId },
		RANK_SYSTEM,
		user
	)
	return { ranking: parseRank(content, state.world, decided) }
}

async function composeNode(state: State): Promise<Partial<State>> {
	const selected = selectRecords(state.ranking ?? EMPTY_RANK, state.world)
	const user = composePrompt(state.self, selected, state.lessons)
	const content = await complete(
		{ name: 'ceo-compose', model: modelFor('ceo-compose'), traceId: state.traceId },
		COMPOSE_SYSTEM,
		user
	)
	return { compose: parseCompose(content) }
}

// Enforce the already-decided skip in code, not just in the prompt: a re-surfaced decided key is dropped.
export function parseRank(
	content: string,
	world: WorldRecord[],
	decided: string[] = []
): RankOutput {
	const parsed = safeJson(content, rankSchema)
	if (!parsed) return EMPTY_RANK
	const known = new Set(world.map((w) => w.dedupeKey))
	const skip = new Set(decided)
	const keep = (sels: { dedupeKey: string; reason: string }[]) =>
		sels.filter((s) => known.has(s.dedupeKey) && !skip.has(s.dedupeKey))
	return {
		people: {
			recommend: keep(parsed.people.recommend),
			antiRecommend: keep(parsed.people.antiRecommend)
		},
		updates: {
			recommend: keep(parsed.updates.recommend),
			antiRecommend: keep(parsed.updates.antiRecommend)
		}
	}
}

export function parseCompose(content: string): ComposeOutput {
	return safeJson(content, composeSchema) ?? EMPTY_COMPOSE
}

// Join ranked dedupeKeys back to their records; type-guards keep people vs updates honest.
export function selectRecords(ranking: RankOutput, world: WorldRecord[]): Selected {
	const byKey = new Map(world.map((w) => [w.dedupeKey, w]))
	const pick = <T extends WorldRecord>(
		keys: { dedupeKey: string }[],
		is: (w: WorldRecord) => w is T
	) =>
		keys
			.map((k) => byKey.get(k.dedupeKey))
			.filter((w): w is WorldRecord => w !== undefined)
			.filter(is)
	return {
		peopleRecommend: pick(ranking.people.recommend, isPerson),
		peopleAntiRecommend: pick(ranking.people.antiRecommend, isPerson),
		updatesRecommend: pick(ranking.updates.recommend, isUpdate),
		updatesAntiRecommend: pick(ranking.updates.antiRecommend, isUpdate)
	}
}

function decidedKeys(system: SystemRecord[]): string[] {
	return system
		.filter((r) => r.type === 'decision')
		.map((r) => (r as { targetKey: string }).targetKey)
}

function isPerson(w: WorldRecord): w is PersonRecord {
	return w.type === 'person'
}

function isUpdate(w: WorldRecord): w is AiUpdateRecord {
	return w.type === 'ai-update'
}
