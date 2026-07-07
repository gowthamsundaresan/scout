import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const nextConfig: NextConfig = {
	// Anchor tracing on the monorepo root — a stray lockfile above the repo confuses inference
	outputFileTracingRoot: resolve(__dirname, '../..')
}

export default nextConfig
