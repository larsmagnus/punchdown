export type HistoryAction = 'undo' | 'redo'

const INPUT_ACTIONS: Partial<Record<string, HistoryAction>> = {
	historyUndo: 'undo',
	historyRedo: 'redo',
}

/**
 * Maps a keystroke to undo or redo, using TipTap's bindings.
 *
 * Ctrl and Cmd both count as Mod, as VS Code's webview host matches them.
 */
export function historyKeyAction(event: KeyboardEvent): HistoryAction | null {
	if (!event.ctrlKey && !event.metaKey) return null

	const key = event.key.toLowerCase()
	if (key === 'y') return 'redo'
	if (key !== 'z') return null
	return event.shiftKey ? 'redo' : 'undo'
}

/** Maps the input a menu's undo or redo arrives as to its history step. */
export function historyInputAction(event: InputEvent): HistoryAction | null {
	return INPUT_ACTIONS[event.inputType] ?? null
}
