import type { Editor } from '@tiptap/core'
import { useEffect, useRef } from 'react'

import { host } from '#src/lib/webview-host'

/**
 * Keeps the VS Code context key `punchdown.hasSelection` in sync
 * with whether the TipTap editor has a text selection, so keybindings can gate
 * on selection state.
 */
export function useSyncSelectionContext(editor: Editor | null): void {
	const lastSentRef = useRef<boolean | null>(null)

	useEffect(() => {
		if (!host.isVSCode || !editor) {
			return
		}

		const updateContext = () => {
			// editor is guaranteed non-null here due to the guard above
			const hasSelection = !editor.state.selection.empty
			if (lastSentRef.current !== hasSelection) {
				lastSentRef.current = hasSelection
				host.send({
					type: 'setHasSelection',
					hasSelection,
				})
			}
		}

		// Update whenever a transaction fires (covers most selection changes).
		editor.on('transaction', updateContext)

		// Re-post current value when the tab becomes visible again, since
		// retainContextWhenHidden keeps editors alive but doesn't fire
		// transactions when switching between tabs. Without this, the global
		// context key could still read a stale value from whichever other tab
		// was just left.
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				updateContext()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Send the current state once on mount.
		updateContext()

		return () => {
			editor.off('transaction', updateContext)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [editor])
}
