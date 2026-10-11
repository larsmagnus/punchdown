export type SuggestionMenuKeyAction = 'dismiss' | 'accept' | 'navigate'

const ACTIONS: Record<string, SuggestionMenuKeyAction> = {
	Escape: 'dismiss',
	Enter: 'accept',
	Tab: 'accept',
	ArrowUp: 'navigate',
	ArrowDown: 'navigate',
}

/**
 * What an open suggestion menu does with a key, or `null` to leave it to the
 * editor. Tab accepts like Enter, as in VS Code. Chords like Shift+Tab or
 * Ctrl+Enter, and keys mid-composition, are never the menu's.
 */
export function suggestionMenuKeyAction(
	event: KeyboardEvent
): SuggestionMenuKeyAction | null {
	const chorded =
		event.shiftKey || event.ctrlKey || event.metaKey || event.altKey
	if (chorded || event.isComposing) return null

	return ACTIONS[event.key] ?? null
}

/** Ctrl+Space, VS Code's own key for asking for suggestions where the caret is. */
export function isOpenShortcut(event: KeyboardEvent): boolean {
	return (
		event.key === ' ' &&
		event.ctrlKey &&
		!event.shiftKey &&
		!event.metaKey &&
		!event.altKey
	)
}
