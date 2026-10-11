import type { Editor } from '@tiptap/react'
import { useEffect } from 'react'

import { scrollToHeadingInEditor } from '#src/editor/extensions/link/scroll-to-heading'
import { useHostMessage } from '#src/hooks/use-host-message'
import { takeHeadingJump } from '#src/lib/heading-jump'

/**
 * Scrolls to a link's target heading - once on mount, for a fresh panel
 * opened with `window.headingJump` already set, and again on every later
 * `jumpToHeading` message, for a panel a link keeps targeting while it stays
 * open. Unlike `useSearchJump`, gated on `active`: raw and live mode are
 * both always mounted (`EditorBody`), and only the one on screen should react
 * to a message meant for whichever the reader is actually looking at.
 */
export function useHeadingJump(editor: Editor | null, active: boolean) {
	useEffect(() => {
		if (!editor || !active) return

		const jump = takeHeadingJump()
		if (jump) scrollToHeadingInEditor(editor.view, jump.hash)
	}, [editor, active])

	useHostMessage(
		'jumpToHeading',
		(message) => {
			if (editor) scrollToHeadingInEditor(editor.view, message.hash)
		},
		active
	)
}
