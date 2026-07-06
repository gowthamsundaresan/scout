# scout — guide for Claude Code

## What this is

The Scout monorepo: a self-improving agentic "firm" that scouts interesting people + AI updates and
delivers 6-hourly digests. The full system architecture (loops, data planes, components) lives in
`~/.claude/plans/scout-architecture.md` — **that doc is the source of truth**; read it before making
structural changes.

This repo is separate from `scout-gateway` (the standalone OSS message bus, built elsewhere). It holds
everything else: the memory data layer and, later, the indexer, evals, and agents.

## Repo map

```
packages/
  memory/             # the data layer — typed, namespace-aware read/write over supermemory
  llm/                # shared OpenRouter client + Langfuse `traced` wrapper + resolveModel
  indexer/            # source-agnostic ingest worker (clean → processing-agent → memory.world)
  agents/             # ceo — 6-hourly digest as a Temporal cron workflow over a LangGraph core
    src/
      ceo/            # graph.ts (rank → compose), digest.ts (render), prompts.ts, models.ts
      gateway/        # client.ts — register + /send to scout-gateway
      temporal/       # activities.ts, workflows.ts, worker.ts, schedule.ts (6h cron)
      bootstrap.ts    # registers the ceo client + digest templates with the gateway
  api/                # ingest gateway (health/config/ingest)
  extension/          # grok-capture browser extension
```

`llm` is the one shared runtime dep of `indexer` + `agents` (kills the duplicated LLM/trace client);
each package keeps its own model-key map. Planned, **not yet present**: `packages/evals`, the
cto-agent (a Temporal signal workflow), and a tg-ingress client.

### memory — the one rule

`memory` writes only **already-structured** records (no raw dumps). Structuring is upstream
(a processing-agent in the indexer). The contract types are the type surface of this package — future
consumers (indexer, agents) import them from `@scout/memory`, so there is no separate "core" package.

## Conventions (match exactly)

- **Minimal comments.** Comment only the non-obvious _why_. Never restate code.
- **Section headers only**, and only these three, when a file has more than one concern:
  `// --- Types & state ---`, `// --- Core functions ---`, `// --- Helper functions ---`.
- **No JSDoc.**
- Formatting: tabs, single quotes, no semicolons, width 100 (prettier enforces).
- Maximal reuse, smallest surface. Justify any new file or package.

## Commands

```sh
npm run build        # tsc across workspaces
npm test             # vitest across workspaces
npm run type-check
npm run lint
npm run format:fix
```
