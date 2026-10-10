import * as path from 'path'

import * as vscode from 'vscode'

import { onDocumentChanged } from '#src/host/document-change-subscription'
import { DocumentWriter } from '#src/host/document-updates'
import { getDocumentResourceRoots } from '#src/host/image-base-uris'
import type { PanelRegistry } from '#src/host/panel-registry'
import type { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'
import { postDocumentUpdate } from '#src/host/post-document-update'
import type { ScrollPositionStore } from '#src/host/scroll-position-store'
import type { SettingsStore } from '#src/host/settings-store'
import { buildWebviewDocument } from '#src/host/webview-document'
import {
	createWebviewMessageHandlers,
	dispatchWebviewMessage,
} from '#src/host/webview-message-handlers'
import type { Logger } from '#src/shared/logger'
import type {
	SearchReveal,
	ShikiThemePayload,
	WebviewToHost,
} from '#src/shared/messages'

type PanelSessionOptions = {
	panel: vscode.WebviewPanel
	document: vscode.TextDocument
	extensionPath: string
	store: SettingsStore
	/** Shared across panels, so a reopened tab finds its own note's offset. */
	scrollPositions: ScrollPositionStore
	/** Set only when the note is opening from a search result; see
	 *  `read-search-reveal.ts`. */
	searchReveal?: SearchReveal
	log: Logger
	/** Re-broadcasts to every open panel, not just this one. */
	broadcastConfig: () => void
	/** The active VS Code theme, for answering this panel's own request. */
	readShikiTheme: () => ShikiThemePayload
	/** Cancelled when the tab closed while the provider was still resolving. */
	token: vscode.CancellationToken
	/** Every open panel - for delivering a heading reveal to a link's
	 *  already-open target. */
	registry: PanelRegistry
	/** A heading reveal queued for this document before its panel existed. */
	pendingReveals: PendingHeadingRevealStore
}

export type PanelSession = {
	/** `null` when the token was already cancelled - see below - and nothing
	 *  was actually wired up for the caller to register anywhere. */
	writer: DocumentWriter | null
	disposable: vscode.Disposable
}

/**
 * Wires one open note to one webview panel, for as long as the panel lives.
 *
 * Returns the panel's `DocumentWriter` - `MarkdownEditorProvider` needs it to
 * answer `onWillSaveTextDocument` for this document - and a disposable
 * covering every subscription this made; the caller disposes it when the
 * panel closes.
 */
export function attachPanelSession({
	panel,
	document,
	extensionPath,
	store,
	scrollPositions,
	searchReveal,
	log,
	broadcastConfig,
	readShikiTheme,
	token,
	registry,
	pendingReveals,
}: PanelSessionOptions): PanelSession {
	// A tab closed while the provider was still awaiting the search results leaves
	// a disposed panel, and every line below throws on one.
	if (token.isCancellationRequested) {
		return { writer: null, disposable: new vscode.Disposable(() => {}) }
	}

	const writer = new DocumentWriter(log)

	panel.webview.options = {
		enableScripts: true,
		localResourceRoots: [
			vscode.Uri.file(path.join(extensionPath, 'dist')),
			vscode.Uri.file(path.join(extensionPath, 'out')),
			...getDocumentResourceRoots(document),
		],
	}

	panel.webview.html = buildWebviewDocument({
		webview: panel.webview,
		document,
		extensionPath,
		config: store.getConfig(),
		initialScrollTop: scrollPositions.get(document.uri.toString()),
		searchReveal,
		headingReveal: pendingReveals.take(document.uri),
		log,
	})

	const { handlers, disposable } = createWebviewMessageHandlers({
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
	})

	return {
		writer,
		disposable: vscode.Disposable.from(
			onDocumentChanged(document, writer, () =>
				postDocumentUpdate(panel, document)
			),
			panel.webview.onDidReceiveMessage((message: WebviewToHost) =>
				dispatchWebviewMessage(handlers, message, log)
			),
			disposable
		),
	}
}
