import type * as vscode from 'vscode'

import type { PanelRegistry } from '#src/host/panel-registry'
import type { PendingHeadingJumpStore } from '#src/host/pending-heading-jump-store'
import type { HostToWebview } from '#src/shared/messages'

/**
 * Delivers a link's `#hash` to whichever of `targetUri`'s panels are already
 * open, or - when none are - records it in `pendingJumps` for
 * `resolveCustomTextEditor` to inject into the one it is about to build.
 *
 * Posted to every open panel for the uri, not just the first: cheap, and
 * correct even with the same note open in two tabs.
 */
export function deliverHeadingJump(
	targetUri: vscode.Uri,
	hash: string,
	registry: PanelRegistry,
	pendingJumps: PendingHeadingJumpStore
): void {
	const open = registry.forUri(targetUri.toString())

	if (open.length === 0) {
		pendingJumps.set(targetUri, hash)
		return
	}

	const message: HostToWebview = { type: 'jumpToHeading', hash }
	for (const { panel } of open) {
		void panel.webview.postMessage(message)
	}
}
