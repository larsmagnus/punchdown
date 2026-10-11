import * as path from 'path'

import * as vscode from 'vscode'

import { VIEW_TYPE } from '#src/host/constants'
import { deliverHeadingJump } from '#src/host/heading-jump-delivery'
import type { PanelRegistry } from '#src/host/panel-registry'
import type { PendingHeadingJumpStore } from '#src/host/pending-heading-jump-store'
import { resolveLinkTarget } from '#src/host/resolve-link-target'
import { isMarkdownFile } from '#src/lib/host/markdown-file-extensions'
import { splitHrefHash } from '#src/lib/host/split-href-hash'
import type { Logger } from '#src/shared/logger'

/**
 * Opens a link target: routes to our editor for markdown files, or
 * `vscode.open` for others. Heading jumps are queued for markdown
 * targets only—`resolveCustomTextEditor` never fires for other file types.
 */
export async function openLinkTarget(
	href: string,
	document: vscode.TextDocument,
	registry: PanelRegistry,
	pendingJumps: PendingHeadingJumpStore,
	log: Logger
): Promise<void> {
	const result = await resolveLinkTarget(href, document)

	if ('error' in result) {
		vscode.window.showErrorMessage(`punchdown: ${result.error}`)
		return
	}

	const { uri } = result
	const isMarkdown = isMarkdownFile(uri.path)

	// Delivered before opening, not after: a target with no panel open yet is
	// answered by queuing the hash in `pendingJumps` for
	// `resolveCustomTextEditor` to pick up, and that only works ahead of the
	// open call below - it reads the queue while building the very panel this
	// triggers, so queuing it afterward is always one open too late.
	const { hash } = splitHrefHash(href)
	if (hash && isMarkdown) {
		deliverHeadingJump(uri, hash, registry, pendingJumps)
	}

	try {
		if (isMarkdown) {
			await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE, {
				preview: true,
			})
		} else {
			await vscode.commands.executeCommand('vscode.open', uri, {
				preview: true,
			})
		}
	} catch (error: unknown) {
		log.error(
			`Failed to open link target ${path.basename(uri.fsPath)}: ${String(error)}`
		)
	}
}
