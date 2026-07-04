import mongoose, { Schema } from 'mongoose'

export type SeedKind = 'location' | 'thesis' | 'ask' | 'offer' | 'ai-update' | 'opportunity'

export type SearchSeedDoc = {
	kind: SeedKind
	key: string
	query: string
	origin?: string
	websetId?: string
	lastSearchAt?: Date
	exhausted: boolean
	totalSeen: number
	inFlightSearchId?: string
	dormant: boolean
}

const searchSeedSchema = new Schema<SearchSeedDoc>(
	{
		kind: { type: String, required: true },
		key: { type: String, required: true, unique: true },
		query: { type: String, required: true },
		origin: { type: String },
		websetId: { type: String },
		lastSearchAt: { type: Date },
		exhausted: { type: Boolean, required: true, default: false },
		totalSeen: { type: Number, required: true, default: 0 },
		inFlightSearchId: { type: String },
		dormant: { type: Boolean, required: true, default: false }
	},
	{ timestamps: true }
)

export const SearchSeed =
	mongoose.models.SearchSeed ?? mongoose.model<SearchSeedDoc>('SearchSeed', searchSeedSchema)
