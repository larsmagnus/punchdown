import type { Editor, Range } from '@tiptap/core'

import { enterImageEditSource } from '#src/editor/extensions/image/edit-source'
import { pickImage } from '#src/lib/pick-image'
import { host } from '#src/lib/webview-host'

/** Inserts an empty image node and opens its source for editing right away. */
function insertEmptyImage(editor: Editor, range: Range) {
	const pos = range.from

	editor
		.chain()
		.focus()
		.deleteRange(range)
		.insertContentAt(pos, { type: 'image', attrs: { src: '' } })
		.command(({ state, dispatch }) =>
			enterImageEditSource(pos)(state, dispatch)
		)
		.run()
}

/**
 * The slash command's "image" action.
 *
 * In VS Code, opens the host's native file dialog and inserts whatever path
 * comes back. Outside VS Code there is no filesystem to pick from (the
 * standalone build's save path is already a stub, per CLAUDE.md), so this
 * inserts an empty image node instead and reveals its source for editing
 * right away - the form the user actually sees, rather than what would
 * otherwise look like nothing happening at all.
 */
export function runInsertImageCommand(editor: Editor, range: Range) {
	if (!host.isVSCode) {
		insertEmptyImage(editor, range)
		return
	}

	// The dialog is async, so the `/image` text is removed up front rather
	// than deferred to when it resolves - by then the caret may have moved,
	// and `range` is only valid against the document state the menu opened
	// with. The image is inserted at the current selection instead.
	editor.chain().focus().deleteRange(range).run()

	void pickImage().then((src) => {
		if (!src) return
		editor.chain().focus().setImage({ src }).run()
	})
}
