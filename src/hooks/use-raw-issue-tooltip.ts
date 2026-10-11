import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

import { spanAtPoint } from '#src/lib/span-at-point'
import type { SourcePlacedIssue } from '#src/lib/text-tools/place-source-issues'

type Point = { x: number; y: number }

/**
 * Shows a text-tools issue's message as the native tooltip while the mouse is
 * over it in raw mode, as the live editor's decorations do. The issue spans
 * sit in the `pointer-events-none` mirror behind the textarea, where a `title`
 * would never be hovered, so the textarea borrows the hovered span's
 * `data-issue-title`. Rechecked when `issues` change, so fixing the word under
 * a resting mouse drops its message.
 */
export function useRawIssueTooltip(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	overlayRef: RefObject<HTMLPreElement | null>,
	issues: SourcePlacedIssue[]
): void {
	const pointRef = useRef<Point | null>(null)

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return

		// Hit-testing reads layout for every issue span, so it runs at most
		// once a frame rather than on every mousemove.
		let frame = 0

		function handleMouseMove(event: MouseEvent) {
			pointRef.current = { x: event.clientX, y: event.clientY }
			if (frame) return
			frame = requestAnimationFrame(() => {
				frame = 0
				updateTitle(textareaRef, overlayRef, pointRef.current)
			})
		}

		function handleMouseLeave() {
			pointRef.current = null
			updateTitle(textareaRef, overlayRef, null)
		}

		textarea.addEventListener('mousemove', handleMouseMove)
		textarea.addEventListener('mouseleave', handleMouseLeave)

		return () => {
			cancelAnimationFrame(frame)
			textarea.removeEventListener('mousemove', handleMouseMove)
			textarea.removeEventListener('mouseleave', handleMouseLeave)
		}
	}, [textareaRef, overlayRef])

	useEffect(() => {
		updateTitle(textareaRef, overlayRef, pointRef.current)
	}, [textareaRef, overlayRef, issues])
}

/** Sets the textarea's title to the issue under `point`, writing only on change. */
function updateTitle(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	overlayRef: RefObject<HTMLPreElement | null>,
	point: Point | null
) {
	const textarea = textareaRef.current
	const overlay = overlayRef.current
	if (!textarea) return

	const span =
		point && overlay ? spanAtPoint(overlay, '[data-issue-title]', point) : null
	const title = span?.dataset.issueTitle ?? ''
	if (textarea.title !== title) textarea.title = title
}
