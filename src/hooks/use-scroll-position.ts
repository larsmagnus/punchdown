import { useEffect, useRef, useState } from 'react'

import { readScrollTop, writeScrollTop } from '#src/lib/scroll-position'
import { scrollRestoreTop } from '#src/lib/scroll/scroll-restore-top'
import { hasSearchJump } from '#src/lib/search-jump'

/**
 * Opens a note where it was last left, and remembers where it is left next.
 *
 * Returns the ref to put on the scrolling element. A note not seen yet this
 * session starts at the top, which is why the editor must not autofocus - a
 * caret placed at either end scrolls itself into view over this.
 *
 * A switch between live and raw mode (`raw`) lets go of the restore early: the
 * switch keeps the reader's place itself (`useModeSwitchAnchor`), and an offset
 * measured in the other mode would only pull them away from it.
 */
export function useScrollPosition(fileName: string, raw: boolean) {
	const containerRef = useRef<HTMLDivElement>(null)
	const releaseRef = useRef<() => void>(() => {})
	const releasedForRef = useRef(raw)

	// Asked while rendering, because the editor claims the jump from an effect
	// and a child's effects run before this hook's - asked any later, the answer
	// would always be "no jump" and the restore would fight it.
	const [jumpPending] = useState(hasSearchJump)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		// Restoration scrolls the container itself, and does so repeatedly while
		// the document is still growing. Recording those intermediate offsets
		// would overwrite the very target being restored to.
		let restoring = true

		const stopRestoring = jumpPending
			? // A note opened from a search result belongs at its match, not where
				// it was last left, so the restore does not start at all rather than
				// racing `useSearchJump` for the same container. Recording stays
				// suppressed for as long as that jump could still be scrolling,
				// or the offset it jumped to becomes the note's remembered position and
				// the next ordinary open lands on the old match.
				//
				// Decided on the jump existing, not on it landing: whether the
				// text can be found is only known inside the editor, an effect
				// later. So a jump whose text is not in the document - it spanned
				// markdown syntax - opens the note at the top rather than where it
				// was left. Rare, and the reader was navigating away from that spot
				// anyway.
				suppressRecordingWhileJumping(() => {
					restoring = false
				})
			: scrollRestoreTop(container, readScrollTop(fileName), {
					onSettled: () => {
						restoring = false
					},
				})

		// Written on every event rather than debounced: a scroll fires at most once
		// per frame, and the panel can still be disposed at any moment - a window
		// reload, the tab closing, the extension host restarting - without running
		// any teardown here, so there is no reliable later moment to flush a
		// pending write.
		const record = () => {
			if (!restoring) writeScrollTop(fileName, container.scrollTop)
		}

		container.addEventListener('scroll', record, { passive: true })

		// Only the restore: a jump's suppression outlasts a switch, since the
		// jump can still be scrolling the page to its match.
		releaseRef.current = jumpPending
			? () => {}
			: () => {
					stopRestoring()
					restoring = false
				}

		return () => {
			stopRestoring()
			container.removeEventListener('scroll', record)
		}
	}, [fileName, jumpPending])

	useEffect(() => {
		if (releasedForRef.current === raw) return
		releasedForRef.current = raw

		releaseRef.current()
	}, [raw])

	return containerRef
}

/**
 * How long a jump is given before the reader's scrolling is recorded again.
 *
 * Matches `scrollHoldInView`'s own window, since that is exactly how long the jump
 * can still be moving the page.
 */
const JUMP_SETTLE_MS = 3000

/** Waits out a jump, then hands recording back. Shaped like the restore's
 *  teardown so the caller can treat the two the same way. */
function suppressRecordingWhileJumping(onSettled: () => void): () => void {
	const timer = setTimeout(onSettled, JUMP_SETTLE_MS)

	return () => clearTimeout(timer)
}
