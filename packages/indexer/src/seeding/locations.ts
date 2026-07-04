import { SearchSeed } from '../db/models/searchSeed'

// $setOnInsert so a re-boot never clobbers an existing location seed's accumulated state.
export async function seedLocations(): Promise<void> {
	const locations = (process.env.INDEXER_LOCATIONS ?? '')
		.split(',')
		.map((location) => location.trim())
		.filter(Boolean)

	for (const location of locations) {
		const key = `location:${location.toLowerCase()}`
		await SearchSeed.updateOne(
			{ key },
			{ $setOnInsert: { kind: 'location', key, query: queryFor(location), origin: 'env' } },
			{ upsert: true }
		)
	}
}

function queryFor(location: string): string {
	return `Interesting people to know in AI, AI x crypto, crypto, venture building, or community building, based in ${location}`
}
