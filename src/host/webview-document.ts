import * as path from 'path'

import * as vscode from 'vscode'

import { getImageBaseUris } from '#src/host/image-base-uris'
import { readEntryChunk } from '#src/host/read-vite-manifest'
import { buildContentSecurityPolicy } from '#src/lib/host/content-security-policy'
import { toLf } from '#src/lib/host/line-endings'
import { createNonce } from '#src/lib/host/nonce'
import { WEBVIEW_LOG_BRIDGE } from '#src/lib/host/webview-diagnostics'
import {
	buildMissingAssetsHtml,
	buildWebviewHtml,
} from '#src/lib/host/webview-html'
import type { Logger } from '#src/shared/logger'
import type { Config, HeadingJump, SearchJump } from '#src/shared/messages'

type WebviewDocumentOptions = {
	webview: vscode.Webview
	document: vscode.TextDocument
	extensionPath: string
	config: Config
	/** This note's remembered scroll offset, injected rather than requested so
	 *  the first paint is already in the right place. */
	initialScrollTop: number
	/** Where this note's search match sits, when it is opening from a search. */
	searchJump?: SearchJump
	/** A link's `#hash`, when this note is opening as its target - see
	 *  `pending-heading-jump-store.ts`. */
	headingJump?: HeadingJump
	log: Logger
}

/**
 * The HTML for one open note, with every hashed asset URL resolved.
 *
 * Falls back to a page naming `pnpm build` when `dist/` has no manifest — an
 * empty panel gives no hint as to why.
 */
export function buildWebviewDocument({
	webview,
	document,
	extensionPath,
	config,
	initialScrollTop,
	searchJump,
	headingJump,
	log,
}: WebviewDocumentOptions): string {
	const distPath = path.join(extensionPath, 'dist')
	const entry = readEntryChunk(distPath, log)

	if (!entry) return buildMissingAssetsHtml()

	const toUri = (file: string) =>
		webview.asWebviewUri(vscode.Uri.file(path.join(distPath, file))).toString()

	const nonce = createNonce()

	log.info(
		`Loading webview for ${path.basename(document.fileName)}: entry ${entry.file}, ${entry.imports.length} imported chunk(s), ${entry.css.length} stylesheet(s)`
	)

	return buildWebviewHtml({
		scriptUri: toUri(entry.file),
		styleUris: entry.css.map(toUri),
		preloadUris: entry.imports.map(toUri),
		nonce,
		contentSecurityPolicy: buildContentSecurityPolicy(webview.cspSource, nonce),
		logBridge: WEBVIEW_LOG_BRIDGE,
		globals: {
			initialContent: toLf(document.getText()),
			fileName: path.basename(document.fileName),
			initialConfig: config,
			initialScrollTop,
			imageBaseUris: getImageBaseUris(webview, document),
			searchJump,
			headingJump,
		},
	})
}
