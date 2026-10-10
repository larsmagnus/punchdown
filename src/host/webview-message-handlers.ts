import * as vscode from 'vscode'

import { createNoteIndexAnswerer } from '#src/host/answer-note-index-request'
import { createAskClaudeHandlers } from '#src/host/ask-claude-handlers'
import type { DocumentWriter } from '#src/host/document-updates'
import { openClaudeTerminal } from '#src/host/open-claude-terminal-command'
import { openInTextEditor } from '#src/host/open-in-text-editor-command'
import { openLinkTarget } from '#src/host/open-link-command'
import { openNoteIndexEntry } from '#src/host/open-note-index-entry'
import type { PanelRegistry } from '#src/host/panel-registry'
import type { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'
import { pickImagePath } from '#src/host/pick-image-command'
import { postDocumentUpdate } from '#src/host/post-document-update'
import type { ScrollPositionStore } from '#src/host/scroll-position-store'
import type { SettingsStore } from '#src/host/settings-store'
import { recordWebviewLog } from '#src/lib/host/webview-diagnostics'
import { EXTENSION_ID } from '#src/shared/constants'
import type { Logger } from '#src/shared/logger'
import type {
	HostToWebview,
	ShikiThemePayload,
	WebviewToHost,
} from '#src/shared/messages'

type WebviewMessageHandlers = {
	[K in WebviewToHost['type']]: (
		message: Extract<WebviewToHost, { type: K }>
	) => void | Promise<void>
}

type HandlerDependencies = {
	panel: vscode.WebviewPanel
	document: vscode.TextDocument
	writer: DocumentWriter
	store: SettingsStore
	scrollPositions: ScrollPositionStore
	log: Logger
	broadcastConfig: () => void
	readShikiTheme: () => ShikiThemePayload
	registry: PanelRegistry
	pendingReveals: PendingHeadingRevealStore
}

/**
 * What the host does with each kind of message from the webview.
 *
 * A record rather than a switch so the mapped type makes a missing case a
 * compile error the moment `WebviewToHost` gains a member.
 */
export type WebviewMessageHandlerSession = {
	handlers: WebviewMessageHandlers
	/**
	 * Covers whatever per-panel state a handler group above needed its own
	 * closure for (currently just `askClaude`'s in-flight request tracking) -
	 * the general contract a handler group with teardown to do returns,
	 * instead of a one-off function `attachPanelSession` has to know by name.
	 */
	disposable: vscode.Disposable
}

export function createWebviewMessageHandlers({
	panel,
	document,
	writer,
	store,
	scrollPositions,
	log,
	broadcastConfig,
	readShikiTheme,
	registry,
	pendingReveals,
}: HandlerDependencies): WebviewMessageHandlerSession {
	const { askClaude, cancelAsk, disposable } = createAskClaudeHandlers({
		panel,
		document,
	})

	const handlers: WebviewMessageHandlers = {
		syncDocument: (message) => writer.write(document, message.content),
		getContent: () => {
			postDocumentUpdate(panel, document)
			// The webview also gets its config injected into the page, but resend
			// it here in case the panel was restored from a cold start.
			broadcastConfig()
		},
		setViewOptions: async (message) => {
			await store.updateViewOptions(message.viewOptions)
			broadcastConfig()
		},
		// Nothing is broadcast back: the offset belongs to this document, and the
		// panel that sent it is already there.
		setScrollTop: (message) => {
			scrollPositions.set(document.uri.toString(), message.scrollTop)
		},
		setHasSelection: (message) => {
			void vscode.commands.executeCommand(
				'setContext',
				`${EXTENSION_ID}.hasSelection`,
				message.hasSelection
			)
		},
		log: (message) => recordWebviewLog(log, message.level, message.message),
		openInTextEditor: () => {
			void openInTextEditor(document.uri)
		},
		openLink: async (message) => {
			await openLinkTarget(
				message.href,
				document,
				registry,
				pendingReveals,
				log
			)
		},
		// Claude reads the file, not our buffer - VS Code no longer saves on
		// every sync, so without this the terminal command it types can point
		// `claude` at content that is still only in the webview.
		openClaudeTerminal: async (message) => {
			await document.save()
			openClaudeTerminal(document.uri, store.getSettings(), message.content)
		},
		// Answers the asking panel alone. Broadcasting instead would make every
		// other open tab reload its theme and re-highlight for a request that
		// told it nothing new.
		getShikiTheme: () => {
			const message: HostToWebview = {
				type: 'shikiTheme',
				...readShikiTheme(),
			}

			void panel.webview.postMessage(message)
		},
		// Also answers the asking panel alone.
		pickImage: async () => {
			const path = await pickImagePath(document, store, log)
			const message: HostToWebview = { type: 'imagePicked', path }
			void panel.webview.postMessage(message)
		},
		getNoteIndex: createNoteIndexAnswerer({ panel, document, store, log }),
		openNoteIndexEntry: (message) =>
			openNoteIndexEntry(message.uri, message.beside),
		askClaude,
		cancelAsk,
		// Resolved by `requestLatestContent`'s own ad-hoc listener, scoped to one
		// in-flight request - not through this table, which has no per-request
		// state to resolve against. Still has to be here, or a real reply from
		// the webview has no handler to dispatch to.
		latestContent: () => {},
	}

	return { handlers, disposable }
}

/**
 * Dispatches one message to its handler. Indexing the record with the message's
 * own `type` does not narrow the argument alongside it, so the cast is what
 * keeps the table's per-member types while still calling it generically.
 *
 * Catches both a synchronous throw and a rejected promise - a handler is
 * fired from `onDidReceiveMessage` with nothing awaiting it, so either would
 * otherwise surface as an unhandled rejection instead of a logged error.
 */
export function dispatchWebviewMessage(
	handlers: WebviewMessageHandlers,
	message: WebviewToHost,
	log: Logger
) {
	const handler = handlers[message.type] as (
		message: WebviewToHost
	) => void | Promise<void>

	try {
		void Promise.resolve(handler(message)).catch((error: unknown) => {
			log.error(
				`Failed to handle webview message "${message.type}": ${String(error)}`
			)
		})
	} catch (error: unknown) {
		log.error(
			`Failed to handle webview message "${message.type}": ${String(error)}`
		)
	}
}
