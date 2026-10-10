import type * as vscode from 'vscode'

import type { PanelRegistry } from '#src/host/panel-registry'
import type { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'
import type { HostToWebview } from '#src/shared/messages'

/**
 * Delivers a link's `#hash` to whichever of `targetUri`'s panels are already
 * open, or - when none are - records it in `pendingReveals` for
 * `resolveCustomTextEditor` to inject into the one it is about to build.
 *
 * Posted to every open panel for the uri, not just the first: cheap, and
 * correct even with the same note open in two tabs.
 */
export function deliverHeadingReveal(
	targetUri: vscode.Uri,
	hash: string,
	registry: PanelRegistry,
	pendingReveals: PendingHeadingRevealStore
): void {
	const open = registry.forUri(targetUri.toString())

	if (open.length === 0) {
		pendingReveals.set(targetUri, hash)
		return
	}

	const message: HostToWebview = { type: 'revealHeading', hash }
	for (const { panel } of open) {
		void panel.webview.postMessage(message)
	}
}
