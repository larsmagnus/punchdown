import { readPanelState, updatePanelState } from '#src/lib/panel-state'
import type { WebviewPanelState } from '#src/lib/panel-state'

export type OnceJump<T> = {
	/** Whether a jump is still owed, without claiming it. */
	has: () => boolean
	/** The jump to act on, once and once only. */
	take: () => T | undefined
}

/**
 * The consume-once contract every injected-global jump shares
 * (`window.searchJump`, `window.headingJump`, ...): the global is
 * injected ahead of the bundle and cannot say whether it has already been
 * acted on, and it has to be acted on exactly once - VS Code destroys the
 * webview for a backgrounded tab and rebuilds it from the HTML it already
 * holds, so the same jump arrives again, looking brand new, every time the
 * reader switches back to the tab. Only the panel's own state survives that,
 * so that is where "already done" is recorded, keyed by `consumedKey`.
 *
 * Ask `has` while rendering, not from an effect: whoever calls `take` does so
 * in an effect, and a child's effects run before its parent's, so a parent
 * asking later would be told the jump had already gone.
 */
export function createOnceJump<T>({
	read,
	consumedKey,
}: {
	/** Parses/validates the injected global; `undefined` when there is
	 *  nothing worth acting on. */
	read: () => T | undefined
	consumedKey: keyof WebviewPanelState
}): OnceJump<T> {
	function has(): boolean {
		if (readPanelState()[consumedKey]) return false

		return read() !== undefined
	}

	function take(): T | undefined {
		if (!has()) return undefined

		updatePanelState({ [consumedKey]: true } as Partial<WebviewPanelState>)

		return read()
	}

	return { has, take }
}
