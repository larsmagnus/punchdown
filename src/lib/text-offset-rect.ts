/**
 * Viewport rect of the character at `offset` in `root`'s text, or `null` when
 * the offset is past the end. Measures the mirror rather than the textarea,
 * which exposes no layout for a character.
 */
function textOffsetRect(root: HTMLElement, offset: number): DOMRect | null {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	let remaining = offset

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const length = node.textContent?.length ?? 0
		if (remaining >= length) {
			remaining -= length
			continue
		}
		const range = document.createRange()
		range.setStart(node, remaining)
		range.setEnd(node, remaining + 1)
		return range.getBoundingClientRect()
	}
	return null
}

/**
 * Where a caret before `offset` sits in the mirror. A line break measures as
 * an empty box, and past the last character there is nothing to measure, so
 * either way the caret sits on the trailing edge of the character before it.
 */
export function caretRectAt(root: HTMLElement, offset: number): DOMRect | null {
	const rect = textOffsetRect(root, offset)
	if (rect && rect.height > 0) return rect
	if (offset === 0) return null

	const previous = textOffsetRect(root, offset - 1)
	if (!previous || previous.height === 0) return null

	return new DOMRect(previous.right, previous.top, 0, previous.height)
}
