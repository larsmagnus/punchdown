import * as vscode from 'vscode'

import { openLinkTarget } from '#src/host/open-link-command'
import { PanelRegistry } from '#src/host/panel-registry'
import { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'

/** Shared fixtures and helpers for the link-opening integration suites. */

const noopLog = { info: () => {}, warn: () => {}, error: () => {} }

export type LinkDeps = {
	registry: PanelRegistry
	pendingReveals: PendingHeadingRevealStore
}

/** Fresh `openLinkTarget` dependencies for one test - never shared across
 *  tests, since both carry state a previous test's link click would leave
 *  behind. */
export function createLinkDeps(): LinkDeps {
	return {
		registry: new PanelRegistry(),
		pendingReveals: new PendingHeadingRevealStore(),
	}
}

/** `openLinkTarget`, with `deps` and the shared `noopLog` already applied -
 *  every test needs the former passed through unchanged, and none want the
 *  latter's output cluttering the run. */
export function openTestLink(
	href: string,
	document: vscode.TextDocument,
	deps: LinkDeps
): Promise<void> {
	return openLinkTarget(
		href,
		document,
		deps.registry,
		deps.pendingReveals,
		noopLog
	)
}
