import mongoose from 'mongoose'

let conn: Promise<typeof mongoose> | undefined

export function connect(uri: string): Promise<typeof mongoose> {
	if (!conn) {
		conn = mongoose.connect(uri)
	}
	return conn
}

export async function disconnect(): Promise<void> {
	if (conn) {
		await mongoose.disconnect()
		conn = undefined
	}
}
