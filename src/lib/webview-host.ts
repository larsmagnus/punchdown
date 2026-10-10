import type { ZodType, z } from 'zod'

import {
	askChunkMessageSchema,
	askDoneMessageSchema,
	askErrorMessageSchema,
	configMessageSchema,
	documentSavedMessageSchema,
	imagePickedMessageSchema,
	noteIndexFailedMessageSchema,
	noteIndexMessageSchema,
	requestLatestMessageSchema,
	revealHeadingMessageSchema,
	shikiThemeMessageSchema,
	showNoteIndexMessageSchema,
	updateMessageSchema,
	webviewPanelStateSchema,
} from '#src/lib/schemas'
import { updateNotes } from '#src/lib/update-notes'
import { writeStoredViewOptions } from '#src/lib/view-options-storage'
import type { HostToWebview, WebviewToHost } from '#src/shared/messages'

/**
 * One schema per message the host can send, keyed by its `type`.
 *
 * The record is exhaustive so a message added to `HostToWebview` without a
 * schema fails to compile rather than arriving unvalidated. It lives here, not
 * in `shared/messages.ts`, because that file is bundled into the extension
 * host, where zod is not available. No schema may use a top-level `.catch()` -
 * a defaulted parse would turn foreign traffic into a bogus message.
 */
const INBOUND_SCHEMAS = {
	update: updateMessageSchema,
	config: configMessageSchema,
	shikiTheme: shikiThemeMessageSchema,
	imagePicked: imagePickedMessageSchema,
	askChunk: askChunkMessageSchema,
	askDone: askDoneMessageSchema,
	askError: askErrorMessageSchema,
	requestLatest: requestLatestMessageSchema,
	documentSaved: documentSavedMessageSchema,
	revealHeading: revealHeadingMessageSchema,
	noteIndex: noteIndexMessageSchema,
	noteIndexFailed: noteIndexFailedMessageSchema,
	showNoteIndex: showNoteIndexMessageSchema,
} satisfies Record<HostToWebview['type'], ZodType>

export type InboundKind = keyof typeof INBOUND_SCHEMAS
export type InboundMessage<K extends InboundKind> = z.output<
	(typeof INBOUND_SCHEMAS)[K]
>

/**
 * What the app does for a message when no host is there to receive it.
 *
 * Only a write has a meaningful standalone meaning; every other message is a
 * request for something the host owns and is dropped.
 */
function sendStandalone(message: WebviewToHost) {
	switch (message.type) {
		case 'syncDocument':
			updateNotes(message.content).catch((error) => {
				console.error('Error saving markdown:', error)
			})
			return
		case 'setViewOptions':
			writeStoredViewOptions(message.viewOptions)
			return
		default:
			return
	}
}

/**
 * The webview's one conversation with the extension host.
 *
 * Which side of the VS Code/standalone fork a call takes is decided on every
 * call from `window.vscode`, never captured: the host injects it ahead of the
 * bundle, so it is already there on the first render, and a test that installs
 * a fake host after import must still be seen.
 */
export const host = {
	/** Synchronous, so the first render already takes the right path. */
	get isVSCode(): boolean {
		return Boolean(window.vscode)
	},

	/** Standalone, a message the host would own is dropped - see `sendStandalone`. */
	send(message: WebviewToHost): void {
		if (!window.vscode) {
			sendStandalone(message)
			return
		}
		window.vscode.postMessage(message)
	},

	/** What the panel recorded for itself, which VS Code keeps across a rebuild. */
	getState(): unknown {
		return window.vscode?.getState()
	},

	/** Replaces, not merges, what the panel recorded - write the whole of it. */
	setState(state: z.output<typeof webviewPanelStateSchema>): void {
		window.vscode?.setState(state)
	},

	/**
	 * Subscribes to one kind of host message and returns the call that stops it.
	 *
	 * A webview's `message` channel carries traffic from anything sharing the
	 * page, so each message is validated rather than trusted.
	 */
	on<K extends InboundKind>(
		kind: K,
		listener: (message: InboundMessage<K>) => void
	): () => void {
		const schema: ZodType = INBOUND_SCHEMAS[kind]

		const handleMessage = (event: MessageEvent) => {
			const parsed = schema.safeParse(event.data)
			if (parsed.success) listener(parsed.data as InboundMessage<K>)
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	},
}
