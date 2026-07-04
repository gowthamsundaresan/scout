import mongoose, { Schema } from 'mongoose'

export type CheckpointDoc = {
	source: string
	cursor: string
}

const checkpointSchema = new Schema<CheckpointDoc>(
	{
		source: { type: String, required: true, unique: true },
		cursor: { type: String, required: true }
	},
	{ timestamps: true }
)

export const Checkpoint =
	mongoose.models.Checkpoint ?? mongoose.model<CheckpointDoc>('Checkpoint', checkpointSchema)
