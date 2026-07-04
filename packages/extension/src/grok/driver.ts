export type GrokResult = {
	success: boolean
	answer?: string
	conversationId?: string
	error?: string
	statusCode?: number
}

const GROK_MODEL = 'grok-3'

export function parseGrokNDJSONStream(text: string): {
	answer: string | null
	conversationId: string | null
} {
	let answer = ''
	let conversationId: string | null = null
	for (const line of text.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed) continue
		try {
			const json = JSON.parse(trimmed)
			const result = json.result
			if (!result) continue
			if (result.conversation?.conversationId && !conversationId) {
				conversationId = result.conversation.conversationId
			}
			if (result.response?.token) answer += result.response.token
		} catch {}
	}
	return { answer: answer || null, conversationId }
}

export async function runGrok(
	prompt: string,
	statsigId: string | null,
	signal?: AbortSignal
): Promise<GrokResult> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Origin: 'https://grok.com',
		Referer: 'https://grok.com/',
		'x-xai-request-id': crypto.randomUUID()
	}
	if (statsigId) headers['x-statsig-id'] = statsigId

	const response = await fetch('https://grok.com/rest/app-chat/conversations/new', {
		method: 'POST',
		headers,
		signal,
		body: JSON.stringify({
			temporary: true,
			message: prompt,
			modelSlug: GROK_MODEL,
			parentResponseId: null,
			fileAttachments: [],
			imageAttachments: [],
			disableSearch: false,
			enableImageGeneration: true,
			returnImageBytes: false,
			returnRawGrokInXaiRequest: false,
			enableImageStreaming: true,
			imageGenerationCount: 2,
			forceConcise: false,
			toolOverrides: {
				gmailSearch: false,
				googleCalendarSearch: false,
				outlookSearch: false,
				outlookCalendarSearch: false,
				googleDriveSearch: false
			},
			enableSideBySide: true,
			sendFinalMetadata: true,
			disableTextFollowUps: false,
			responseMetadata: {},
			disableMemory: true,
			forceSideBySide: false,
			isAsyncChat: false,
			disableSelfHarmShortCircuit: false,
			collectionIds: [],
			connectors: [],
			searchAllConnectors: false,
			deviceEnvInfo: {
				darkModeEnabled: false,
				devicePixelRatio: 1,
				screenWidth: 1920,
				screenHeight: 1080,
				viewportWidth: 1920,
				viewportHeight: 1080
			},
			modeId: 'auto'
		}),
		credentials: 'include'
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => '')
		return {
			success: false,
			error: `API error ${response.status}: ${errorText}`,
			statusCode: response.status
		}
	}

	const text = await response.text()
	const { answer, conversationId } = parseGrokNDJSONStream(text)
	if (!answer) {
		return {
			success: false,
			error: 'No answer extracted from NDJSON stream',
			conversationId: conversationId ?? undefined
		}
	}
	return { success: true, answer, conversationId: conversationId ?? undefined }
}
