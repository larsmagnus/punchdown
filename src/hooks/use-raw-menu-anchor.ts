import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

import { caretRectAt } from '#src/lib/text-offset-rect'

export type RawMenuAnchor = { top: number; left: number }

/**
 * Where a raw-mode menu opened at offset `from` sits inside `wrapper`: under
 * the caret there, so it scrolls with the text. `null` while nothing is open.
 */
export function useRawMenuAnchor(
	from: number | null,
	draft: string,
	overlayRef: RefObject<HTMLPreElement | null>,
	wrapperRef: RefObject<HTMLDivElement | null>
): RawMenuAnchor | null {
	const [anchor, setAnchor] = useState<RawMenuAnchor | null>(null)

	// After the mirror has rendered the query, so its rect is where the caret is.
	useLayoutEffect(() => {
		const overlay = overlayRef.current
		const wrapper = wrapperRef.current
		const rect = from !== null && overlay && caretRectAt(overlay, from)
		if (!rect || !wrapper) {
			setAnchor(null)
			return
		}
		const origin = wrapper.getBoundingClientRect()
		setAnchor({ top: rect.bottom - origin.top, left: rect.left - origin.left })
	}, [from, draft, overlayRef, wrapperRef])

	return anchor
}
