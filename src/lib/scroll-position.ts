import { readPanelState, updatePanelState } from '#src/lib/panel-state'
import { scrollTopSchema } from '#src/lib/schemas'
import { host } from '#src/lib/webview-host'
import { EXTENSION_ID } from '#src/shared/constants'

const STORAGE_KEY_PREFIX = `${EXTENSION_ID}:scroll-top:`

/**
 * Where a note was last scrolled to, from whichever side remembers it.
 *
 * In VSCode there are two. Closing the tab leaves only the host, which
 * injects `window.initialScrollTop` ahead of the bundle. A window reload or
 * reopening a closed tab still rebuilds the webview from that same frozen
 * HTML - `retainContextWhenHidden` (`markdown-editor-provider.ts`) only
 * covers backgrounding the tab, not those - so the panel's own `setState`,
 * read first here, is what carries a newer value across a rebuild it does
 * survive.
 *
 * Standalone there is no host, and `sessionStorage` matches the same
 * session-scoped lifetime.
 */
export function readScrollTop(fileName: string): number {
	if (!host.isVSCode)
		return scrollTopSchema.parse(readStoredScrollTop(fileName))

	const { scrollTop } = readPanelState()
	if (scrollTop !== undefined) return scrollTop

	return scrollTopSchema.parse(window.initialScrollTop)
}

export function writeScrollTop(fileName: string, scrollTop: number) {
	if (host.isVSCode) {
		// Both sides, since neither survives what the other does: `setState` dies
		// with the tab, and the host's copy is only re-read when a panel is built
		// from scratch.
		updatePanelState({ scrollTop })
		host.send({ type: 'setScrollTop', scrollTop })
		return
	}

	sessionStorage.setItem(STORAGE_KEY_PREFIX + fileName, String(scrollTop))
}

/** `null` rather than a default, leaving the one fallback to the schema. */
function readStoredScrollTop(fileName: string): number | null {
	const stored = sessionStorage.getItem(STORAGE_KEY_PREFIX + fileName)

	return stored === null ? null : Number(stored)
}
