import type { ModeView } from '#src/lib/mode-switch/mode-view'
import { caretRectAt } from '#src/lib/text-offset-rect'

/** The two elements a raw-mode `ModeView` reads: the textarea, and the mirror
 *  laid out behind it that exposes per-character geometry. */
export type RawModeElements = {
	textarea: HTMLTextAreaElement
	overlay: HTMLElement
}

/** Raw mode's textarea as a `ModeView`. */
export function createRawModeView({
	textarea,
	overlay,
}: RawModeElements): ModeView {
	const offsetRect = (offset: number) => caretRectAt(overlay, offset)

	return {
		root: overlay,
		text: () => textarea.value,
		selection: () => {
			const { selectionStart, selectionEnd, selectionDirection } = textarea
			return selectionDirection === 'backward'
				? { anchor: selectionEnd, head: selectionStart }
				: { anchor: selectionStart, head: selectionEnd }
		},
		setSelection: ({ anchor, head }) => {
			textarea.setSelectionRange(
				Math.min(anchor, head),
				Math.max(anchor, head),
				head < anchor ? 'backward' : 'forward'
			)
		},
		hasFocus: () => document.activeElement === textarea,
		focus: () => textarea.focus({ preventScroll: true }),
		offsetRect,
		offsetAtY: (y) => {
			// Binary search: the mirror lays text out top to bottom, so the bottom
			// edge of each character's line never decreases with its offset.
			let low = 0
			let high = textarea.value.length
			while (low < high) {
				const middle = Math.floor((low + high) / 2)
				const rect = offsetRect(middle)
				if (rect && rect.bottom > y) high = middle
				else low = middle + 1
			}
			return low
		},
	}
}
