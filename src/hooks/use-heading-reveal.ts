import type { Editor } from '@tiptap/react'
import { useEffect } from 'react'

import { scrollToHeadingInEditor } from '#src/editor/extensions/link/scroll-to-heading'
import { useHostMessage } from '#src/hooks/use-host-message'
import { takeHeadingReveal } from '#src/lib/heading-reveal'

/**
 * Scrolls to a link's target heading - once on mount, for a fresh panel
 * opened with `window.headingReveal` already set, and again on every later
 * `revealHeading` message, for a panel a link keeps targeting while it stays
 * open. Unlike `useSearchReveal`, gated on `active`: raw and live mode are
 * both always mounted (`EditorBody`), and only the one on screen should react
 * to a message meant for whichever the reader is actually looking at.
 */
export function useHeadingReveal(editor: Editor | null, active: boolean) {
	useEffect(() => {
		if (!editor || !active) return

		const reveal = takeHeadingReveal()
		if (reveal) scrollToHeadingInEditor(editor.view, reveal.hash)
	}, [editor, active])

	useHostMessage(
		'revealHeading',
		(message) => {
			if (editor) scrollToHeadingInEditor(editor.view, message.hash)
		},
		active
	)
}
