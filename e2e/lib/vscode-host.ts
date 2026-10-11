import type { Page } from '@playwright/test'

import type { DirectoryEntry, WebviewToHost } from '#src/shared/messages'

/**
 * Puts the app on the VS Code data path (`useHostDocument`) instead of the
 * standalone demo path, by seeding the globals the real webview host injects.
 * The seed is an init script, so it applies to the `page.goto` this makes.
 *
 * The extension of `fileName` decides the file kind. It defaults to `notes.md`;
 * override it for `.txt` or `.mdx` behavior.
 *
 * `directories` answers `listDirectory` as the host would, keyed by the path
 * asked for; a path it leaves out lists nothing. `listingDelays` holds a
 * path's answer back that many milliseconds, as a slow git walk would.
 */
export async function openInVSCode(
	page: Page,
	content: string,
	fileName = 'notes.md',
	directories: Record<string, DirectoryEntry[]> = {},
	listingDelays: Record<string, number> = {}
) {
	await page.addInitScript(
		({ initialContent, initialFileName, listings, delays }) => {
			window.vscode = {
				postMessage: (message: WebviewToHost) => {
					if (message.type !== 'listDirectory') return
					setTimeout(() => {
						window.postMessage({
							type: 'directoryListing',
							requestId: message.requestId,
							entries: listings[message.directory] ?? [],
						})
					}, delays[message.directory] ?? 0)
				},
				getState: () => undefined,
				setState: () => {},
			}
			window.initialContent = initialContent
			window.fileName = initialFileName
		},
		{
			initialContent: content,
			initialFileName: fileName,
			listings: directories,
			delays: listingDelays,
		}
	)

	await page.goto('/')
}
