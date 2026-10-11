import type { Editor } from '@tiptap/react'
import { useEffect } from 'react'

import { findOccurrences } from '#src/editor/extensions/search-jump/find-occurrences'
import { SEARCH_JUMP_TARGET_CLASS } from '#src/editor/extensions/search-jump/search-jump-extension'
import { scrollHoldInView } from '#src/lib/scroll/scroll-hold-in-view'
import { takeSearchJump } from '#src/lib/search-jump'

/**
 * Scrolls a note opened from a search result to its match, and highlights every
 * other place the same text occurs.
 *
 * The host names one match; the rest are found here by looking for its text, so
 * the first occurrence in document order is the one scrolled to.
 *
 * Fires once per editor instance, which the dependency alone gives - and it has
 * to be per instance, not per panel. TipTap rebuilds the editor during startup,
 * so a `useRef` guard meant to fire "only once" let the first, discarded editor
 * consume the jump and left the one on screen with neither highlight nor
 * scroll.
 *
 * Silent when the searched-for text is not in the rendered document. That
 * happens when the match spanned markdown syntax the editor no longer shows -
 * the `**` of a bold run, a link's target - and the honest answer there is to
 * leave the note where it opened rather than scroll somewhere approximate.
 */
export function useSearchJump(editor: Editor | null) {
	useEffect(() => {
		if (!editor) return

		const jump = takeSearchJump()
		if (!jump) return

		const occurrences = findOccurrences(editor.state.doc, jump.text)
		if (occurrences.length === 0) return

		editor.commands.setSearchJumpRanges(occurrences)

		return scrollHoldInView(() => targetElement(editor))
	}, [editor])
}

/**
 * The rendered element holding the target match.
 *
 * Found by its own decoration class rather than from the document position.
 * `domAtPos` answers with the *parent* of the position - inside a code block
 * that is the whole block - so centring what it returns centred a hundred lines
 * of code and left the match itself off screen. The highlight knows exactly
 * where it ended up; nothing else does.
 *
 * Re-queried on every call, so a node view remounting under it is followed.
 */
function targetElement(editor: Editor): Element | null {
	if (editor.isDestroyed) return null

	return editor.view.dom.querySelector(`.${SEARCH_JUMP_TARGET_CLASS}`)
}
