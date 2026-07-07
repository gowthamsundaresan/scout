import { build } from 'esbuild'
import { copyFile, mkdir, readFile } from 'node:fs/promises'

// Bake ingest defaults from the monorepo .env into the bundle (personal build — never publish it).
const env = Object.fromEntries(
	(await readFile(new URL('../../.env', import.meta.url), 'utf8').catch(() => ''))
		.split('\n')
		.filter((line) => line.includes('='))
		.map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
)

const shared = {
	bundle: true,
	target: 'chrome120',
	outdir: 'dist',
	define: {
		__SCOUT_API_BASE__: JSON.stringify(env.SCOUT_API_PUBLIC_URL ?? ''),
		__SCOUT_INGEST_TOKEN__: JSON.stringify(env.INGEST_SECRET ?? '')
	}
}

await build({
	...shared,
	format: 'esm',
	entryPoints: [
		{ in: 'src/background.ts', out: 'background' },
		{ in: 'src/popup/popup.ts', out: 'popup' },
		{ in: 'src/offscreen/offscreen.ts', out: 'offscreen' }
	]
})

await build({
	...shared,
	format: 'iife',
	entryPoints: [{ in: 'src/content-scripts/grok-early-hook.ts', out: 'grok-early-hook' }]
})

await mkdir('dist', { recursive: true })
await copyFile('manifest.json', 'dist/manifest.json')
await copyFile('src/popup/popup.html', 'dist/popup.html')
await copyFile('src/offscreen/offscreen.html', 'dist/offscreen.html')
await copyFile('rules/grok-rules.json', 'dist/grok-rules.json')

console.log('built extension → packages/extension/dist (load unpacked)')
