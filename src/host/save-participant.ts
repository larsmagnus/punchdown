import * as vscode from 'vscode'

import { requestLatestContent } from '#src/host/latest-content-request'
import type { OpenPanel } from '#src/host/panel-registry'
import type { Logger } from '#src/shared/logger'
import type { HostToWebview } from '#src/shared/messages'

/**
 * Registers the two subscriptions that make any VS Code save exact, and
 * every open panel learn the document just went clean.
 *
 * One registration for the whole extension, not one per panel: two tabs on
 * the same file would otherwise each independently contribute a will-save
 * edit computed from their own webview's answer, and applying both risks
 * VS Code rejecting the save over the overlap. Asking only one representative
 * session avoids that; `onDidSaveTextDocument` still reaches every panel
 * showing the document, since each keeps its own dirty tracking.
 */
/** The panel actually focused by the user, or an arbitrary one if none is -
 *  a save triggered with no panel focused (Save All, a script) still needs
 *  someone to ask. */
function pickSession(sessions: readonly OpenPanel[]): OpenPanel | undefined {
	for (const session of sessions) {
		if (session.panel.active) return session
	}

	return sessions[0]
}

export function registerSaveParticipant(
	getSessions: (uri: vscode.Uri) => readonly OpenPanel[],
	log: Logger
): vscode.Disposable {
	return vscode.Disposable.from(
		// Makes the keystroke, Save All, `files.autoSave` and the close prompt
		// all write exact text - not whatever the last debounced sync carried -
		// by asking the webview for its current text and applying it through
		// the writer before the save proceeds, rather than through the
		// contributed-edits mechanism `waitUntil` also supports: reusing the
		// writer keeps `matchesLastWrite` correct, so the host does not echo
		// this text straight back at the webview as if it were an outside edit.
		vscode.workspace.onWillSaveTextDocument((event) => {
			const session = pickSession(getSessions(event.document.uri))
			if (!session) return

			event.waitUntil(
				requestLatestContent(session.panel).then(
					async ({ content, timedOut }) => {
						if (content === null) {
							if (timedOut) {
								log.warn(
									'Timed out asking the webview for its current text before saving; saving the last synced text instead.'
								)
							}
							return []
						}

						// Degrades the same way a timeout does: the save still proceeds
						// with whatever is already on the document, rather than a
						// rejected write here blocking or failing the whole save.
						try {
							await session.writer.write(event.document, content)
						} catch (error: unknown) {
							log.error(
								`Failed to apply the webview's current text before saving: ${String(error)}`
							)
						}

						return []
					}
				)
			)
		}),
		vscode.workspace.onDidSaveTextDocument((document) => {
			const message: HostToWebview = { type: 'documentSaved' }
			for (const { panel } of getSessions(document.uri)) {
				void panel.webview.postMessage(message)
			}
		})
	)
}
