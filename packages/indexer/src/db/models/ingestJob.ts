import mongoose, { Schema } from 'mongoose'

import type { RawItem } from '../../sources/types'

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed'

export type IngestJobDoc = {
	source: string
	item: RawItem
	status: JobStatus
	attempts: number
	written: string[]
	error?: string
}

const ingestJobSchema = new Schema<IngestJobDoc>(
	{
		source: { type: String, required: true, index: true },
		item: { type: Schema.Types.Mixed, required: true },
		status: { type: String, required: true, default: 'queued', index: true },
		attempts: { type: Number, required: true, default: 0 },
		written: { type: [String], required: true, default: [] },
		error: { type: String }
	},
	{ timestamps: true }
)

export const IngestJob =
	mongoose.models.IngestJob ?? mongoose.model<IngestJobDoc>('IngestJob', ingestJobSchema)
