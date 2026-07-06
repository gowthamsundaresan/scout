// Env overrides a key's default model, e.g. MODEL_CEO_COMPOSE=anthropic/claude-opus-4.8
export function resolveModel(key: string, fallback: string): string {
	return process.env[`MODEL_${key.toUpperCase().replace(/-/g, '_')}`] || fallback
}
