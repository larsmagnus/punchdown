import type { RefObject } from 'react'
import { useEffect } from 'react'

import { useHostMessage } from '#src/hooks/use-host-message'
import { takeHeadingReveal } from '#src/lib/heading-reveal'
import { revealRawHeading } from '#src/lib/reveal-raw-heading'

/**
 * Raw mode's half of `useHeadingReveal`: selects a link's target heading
 * once on mount for a fresh panel, and again on every later `revealHeading`
 * message. Gated on `active` for the same reason - see that hook's doc
 * comment.
 */
export function useRawHeadingReveal(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	draftRef: RefObject<string>,
	active: boolean
) {
	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea || !active) return

		const reveal = takeHeadingReveal()
		if (reveal) revealRawHeading(textarea, draftRef.current, reveal.hash)
	}, [textareaRef, draftRef, active])

	useHostMessage(
		'revealHeading',
		(message) => {
			const textarea = textareaRef.current
			if (textarea) revealRawHeading(textarea, draftRef.current, message.hash)
		},
		active
	)
}
