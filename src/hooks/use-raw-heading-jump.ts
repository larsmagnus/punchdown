import type { RefObject } from 'react'
import { useEffect } from 'react'

import { useHostMessage } from '#src/hooks/use-host-message'
import { takeHeadingJump } from '#src/lib/heading-jump'
import { jumpToRawHeading } from '#src/lib/jump-to-raw-heading'

/**
 * Raw mode's half of `useHeadingJump`: selects a link's target heading
 * once on mount for a fresh panel, and again on every later `jumpToHeading`
 * message. Gated on `active` for the same reason - see that hook's doc
 * comment.
 */
export function useRawHeadingJump(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	draftRef: RefObject<string>,
	active: boolean
) {
	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea || !active) return

		const jump = takeHeadingJump()
		if (jump) jumpToRawHeading(textarea, draftRef.current, jump.hash)
	}, [textareaRef, draftRef, active])

	useHostMessage(
		'jumpToHeading',
		(message) => {
			const textarea = textareaRef.current
			if (textarea) jumpToRawHeading(textarea, draftRef.current, message.hash)
		},
		active
	)
}
