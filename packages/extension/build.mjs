import { build } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'

const shared = { bundle: true, target: 'chrome120', outdir: 'dist' }

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
