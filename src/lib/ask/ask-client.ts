import {
	askChunkMessageSchema,
	askDoneMessageSchema,
	askErrorMessageSchema,
} from '#src/lib/schemas'
import { host } from '#src/lib/webview-host'

type AskHandlers = {
	onChunk: (text: string) => void
	onDone: () => void
	onError: (error: string) => void
}

export type AskClient = {
	/** Starts a request, returning the `requestId` so the caller can cancel it. */
	ask: (
		prompt: string,
		selectedText: string | undefined,
		handlers: AskHandlers
	) => string
	cancel: (requestId: string) => void
}

/**
 * Talks to the extension host's `askClaude` handler, correlating streamed
 * replies to the request that started them by `requestId` - mirrors
 * `analyze-client.ts`'s pending-map shape, but over `postMessage` to the host
 * rather than a Worker, since this isn't CPU-bound work needing a thread of
 * its own.
 *
 * A single module-scope instance (`getAskClient`) is shared by both the
 * `/ask` slash command and the bubble menu's proposal flow, so there is one
 * `message` subscription for the feature, not one per caller.
 */
export function createAskClient(): AskClient {
	const pending = new Map<string, AskHandlers>()

	window.addEventListener('message', (event: MessageEvent) => {
		const chunk = askChunkMessageSchema.safeParse(event.data)
		if (chunk.success) {
			pending.get(chunk.data.requestId)?.onChunk(chunk.data.text)
			return
		}

		const done = askDoneMessageSchema.safeParse(event.data)
		if (done.success) {
			pending.get(done.data.requestId)?.onDone()
			pending.delete(done.data.requestId)
			return
		}

		const error = askErrorMessageSchema.safeParse(event.data)
		if (error.success) {
			pending.get(error.data.requestId)?.onError(error.data.error)
			pending.delete(error.data.requestId)
		}
	})

	const ask = (
		prompt: string,
		selectedText: string | undefined,
		handlers: AskHandlers
	): string => {
		const requestId = crypto.randomUUID()
		pending.set(requestId, handlers)
		host.send({
			type: 'askClaude',
			requestId,
			prompt,
			selectedText,
		})
		return requestId
	}

	const cancel = (requestId: string) => {
		pending.delete(requestId)
		host.send({ type: 'cancelAsk', requestId })
	}

	return { ask, cancel }
}

let client: AskClient | undefined

/** The one `AskClient` instance the webview uses - created lazily, on first ask. */
export function getAskClient(): AskClient {
	client ??= createAskClient()
	return client
}
