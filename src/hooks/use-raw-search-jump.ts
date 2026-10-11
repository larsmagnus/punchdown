import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

import { findRawSearchRange } from '#src/lib/raw-search-jump'
import { takeSearchJump } from '#src/lib/search-jump'

/**
 * Selects and scrolls to a pending search match in raw mode, once, on mount.
 *
 * A textarea can highlight nothing but its own selection, so selecting the
 * match *is* the highlight here - and focusing is what scrolls the container
 * to it. The usual "nothing may autofocus" rule is about not fighting the
 * remembered scroll position, which a jump deliberately overrides anyway.
 */
export function useRawSearchJump(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	draftRef: RefObject<string>
) {
	const jumped = useRef(false)

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea || jumped.current) return

		const jump = takeSearchJump()
		if (!jump) return

		const range = findRawSearchRange(draftRef.current, jump)
		if (!range) return

		jumped.current = true
		textarea.focus()
		textarea.setSelectionRange(range.start, range.end)
	}, [textareaRef, draftRef])
}
