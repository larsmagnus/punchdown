import { findRawHeadingAnchors } from '#src/lib/link/raw-heading-anchors'

/**
 * Selects and scrolls to `hash`'s heading in a raw-mode textarea - the same
 * "selecting is the highlight, focusing is the scroll" trick
 * `use-raw-search-jump.ts` uses, since a textarea has no other way to draw
 * attention to a position. Silent when nothing matches.
 *
 * `hash` is lowercased before matching - see `scroll-to-heading.ts`'s own
 * doc comment for why.
 */
export function jumpToRawHeading(
	textarea: HTMLTextAreaElement,
	source: string,
	hash: string
): void {
	const target = hash.toLowerCase()
	const anchor = findRawHeadingAnchors(source).find((a) => a.hash === target)
	if (!anchor) return

	textarea.focus()
	textarea.setSelectionRange(anchor.offset, anchor.offset)
}
