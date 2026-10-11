import type { RefObject } from 'react'
import { useEffect } from 'react'

import { findLinkAtOffset } from '#src/editor/extensions/link/raw-link-at-offset'
import { jumpToRawHeading } from '#src/lib/jump-to-raw-heading'
import { openLink } from '#src/lib/link/open-link'
import { resolveLinkHref } from '#src/lib/link/resolve-link-href'

/**
 * Cmd (mac) / Ctrl (win/linux) + click follows a link in raw mode, mirroring
 * VS Code's own text-editor convention - a plain click has to keep placing
 * the caret, since raw mode is a real textarea being edited, not a rendered
 * preview.
 *
 * Reads `textarea.selectionStart` inside `mousedown` rather than computing a
 * pixel-to-offset position: the browser's own native caret placement runs
 * ahead of a `mousedown` listener, and only `preventDefault()`'s timing
 * matters here, not the read's - the same-document branch immediately
 * overwrites the caret with `setSelectionRange` regardless, and the two
 * host-bound branches are about to navigate away.
 */
export function useRawLinkClick(
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	draftRef: RefObject<string>
) {
	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return

		function handleMouseDown(event: MouseEvent) {
			if (event.button !== 0 || (!event.metaKey && !event.ctrlKey)) return

			const offset = textarea!.selectionStart
			const match = findLinkAtOffset(draftRef.current, offset)
			if (!match) return

			event.preventDefault()

			const resolved = resolveLinkHref(match.href)
			if (resolved.kind === 'external') {
				window.open(match.href, '_blank', 'noopener,noreferrer')
			} else if (resolved.kind === 'same-document-hash') {
				jumpToRawHeading(textarea!, draftRef.current, resolved.hash)
			} else {
				openLink(resolved.href)
			}
		}

		textarea.addEventListener('mousedown', handleMouseDown)
		return () => textarea.removeEventListener('mousedown', handleMouseDown)
	}, [textareaRef, draftRef])
}
