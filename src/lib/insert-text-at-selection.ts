/**
 * Replaces the textarea's selection with `text` and puts the caret `caretOffset`
 * into it (the end by default).
 *
 * Goes through `execCommand` so the edit raises a real `input` event, which the
 * controlled textarea syncs and records as an undo step like typing. The
 * fallback covers hosts without it.
 */
export function insertTextAtSelection(
	textarea: HTMLTextAreaElement,
	text: string,
	caretOffset: number = text.length
): void {
	const start = textarea.selectionStart
	textarea.focus()
	if (!document.execCommand('insertText', false, text)) {
		textarea.setRangeText(text, start, textarea.selectionEnd, 'end')
		textarea.dispatchEvent(new Event('input', { bubbles: true }))
	}
	textarea.setSelectionRange(start + caretOffset, start + caretOffset)
}
