import { webviewPanelStateSchema } from '#src/lib/schemas'
import { host } from '#src/lib/webview-host'

export type WebviewPanelState = {
	/** How far down the note was scrolled, or absent if it never was. */
	scrollTop?: number
	/** Whether the injected search jump has already been acted on. */
	searchJumpConsumed?: boolean
	/** Whether the injected heading jump has already been acted on. */
	headingJumpConsumed?: boolean
}

/**
 * The panel's own state, the one thing that survives VS Code rebuilding the
 * webview.
 *
 * `retainContextWhenHidden` (`markdown-editor-provider.ts`) keeps a
 * backgrounded tab's webview alive, so this state is no longer what carries a
 * note across that specific transition - a window reload or reopening a
 * closed tab still rebuilds the page from HTML frozen when the note first
 * opened, and those are the cases this remains for. Anything that must not
 * happen twice across one of those has to be recorded here rather than
 * inferred from the injected globals - those come back looking brand new
 * every time.
 *
 * Read and written as a whole, because `setState` replaces rather than merges:
 * writing one field on its own silently drops the other.
 */
export function readPanelState(): WebviewPanelState {
	return webviewPanelStateSchema.parse(host.getState())
}

export function updatePanelState(patch: WebviewPanelState) {
	host.setState({ ...readPanelState(), ...patch })
}
