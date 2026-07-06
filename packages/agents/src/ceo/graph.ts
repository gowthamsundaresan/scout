import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { z } from 'zod'

import { getClient, traceId as newTraceId, traced } from '@scout/llm'
import type {
	AiUpdateRecord,
	PersonRecord,
	SelfRecord,
	SystemRecord,
	WorldRecord
} from '@scout/memory'

import { type ComposeOutput, type Digest, composeSchema, renderDigest } from './digest'
import { modelFor } from './models'
import { COMPOSE_SYSTEM, RANK_SYSTEM, type Selected, composePrompt, rankPrompt } from './prompts'

// --- Types & state ---

const selectionSchema = z.object({ dedupeKey: z.string().min(1), reason: z.string() })

export const rankSchema = z.object({
	recommend: z.array(selectionSchema),
	antiRecommend: z.array(selectionSchema),
	updates: z.array(selectionSchema)
})

export type RankOutput = z.infer<typeof rankSchema>

export type CeoContext = { self: SelfRecord[]; world: WorldRecord[]; system: SystemRecord[] }
export type CeoResult = { digest: Digest; ranking: RankOutput; compose: ComposeOutput }

const EMPTY_RANK: RankOutput = { recommend: [], antiRecommend: [], updates: [] }
const EMPTY_COMPOSE: ComposeOutput = {
	recommend: { headline: '', people: [] },
	updates: [],
	antiRecommend: { people: [] }
}

const CeoState = Annotation.Root({
	self: Annotation<SelfRecord[]>(),
	world: Annotation<WorldRecord[]>(),
	system: Annotation<SystemRecord[]>(),
	traceId: Annotation<string>(),
	ranking: Annotation<RankOutput>(),
	compose: Annotation<ComposeOutput>()
})

type State = typeof CeoState.State

// --- Core functions ---

export async function runCeoGraph(ctx: CeoContext): Promise<CeoResult> {
	const graph = buildGraph()
	const res = await graph.invoke({
		self: ctx.self,
		world: ctx.world,
		system: ctx.system,
		traceId: newTraceId('ceo-digest')
	})
	const compose = res.compose ?? EMPTY_COMPOSE
	return { digest: renderDigest(compose), ranking: res.ranking ?? EMPTY_RANK, compose }
}

export function buildGraph() {
	return new StateGraph(CeoState)
		.addNode('rank', rankNode)
		.addNode('compose', composeNode)
		.addEdge(START, 'rank')
		.addEdge('rank', 'compose')
		.addEdge('compose', END)
		.compile()
}

// --- Helper functions ---

async function rankNode(state: State): Promise<Partial<State>> {
	const pool = state.world.map((w) => ({
		dedupeKey: w.dedupeKey,
		type: w.type,
		title: w.title,
		summary: w.summary,
		salience: w.salience
	}))
	const user = rankPrompt(state.self, pool, decidedKeys(state.system))
	const content = await complete('ceo-rank', state.traceId, RANK_SYSTEM, user)
	return { ranking: parseRank(content, state.world) }
}

async function composeNode(state: State): Promise<Partial<State>> {
	const selected = selectRecords(state.ranking ?? EMPTY_RANK, state.world)
	const user = composePrompt(state.self, selected)
	const content = await complete('ceo-compose', state.traceId, COMPOSE_SYSTEM, user)
	return { compose: parseCompose(content) }
}

async function complete(
	node: 'ceo-rank' | 'ceo-compose',
	traceId: string,
	system: string,
	user: string
): Promise<string> {
	const model = modelFor(node)
	return traced({ name: node, model, traceId, input: { user } }, async () => {
		const res = await getClient().chat.completions.create({
			model,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			response_format: { type: 'json_object' }
		})
		return {
			output: res.choices[0]?.message?.content ?? '{}',
			usage: res.usage && {
				input: res.usage.prompt_tokens,
				output: res.usage.completion_tokens,
				total: res.usage.total_tokens
			}
		}
	})
}

export function parseRank(content: string, world: WorldRecord[]): RankOutput {
	const parsed = safeJson(content, rankSchema)
	if (!parsed) return EMPTY_RANK
	const known = new Set(world.map((w) => w.dedupeKey))
	const keep = (sels: RankOutput['recommend']) => sels.filter((s) => known.has(s.dedupeKey))
	return {
		recommend: keep(parsed.recommend),
		antiRecommend: keep(parsed.antiRecommend),
		updates: keep(parsed.updates)
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
		recommend: pick(ranking.recommend, isPerson),
		antiRecommend: pick(ranking.antiRecommend, isPerson),
		updates: pick(ranking.updates, isUpdate)
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

function safeJson<T>(content: string, schema: z.ZodType<T>): T | null {
	let json: unknown
	try {
		json = JSON.parse(content)
	} catch {
		return null
	}
	const parsed = schema.safeParse(json)
	return parsed.success ? parsed.data : null
}
