import type { Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'

import { patchNoteContent } from '#src/editor/extensions/markdown/block-source/patch-note-content'
import { loadNoteContent } from '#src/editor/load-note-content'
import type { FileKind } from '#src/lib/file-kind'

/** Stable, so the default does not re-run the effect on every render. */
const neverOwnSync = () => false

/**
 * Rebuilds the document whenever the incoming file changes underneath it.
 *
 * Frontmatter is a real node inside the doc, so `editor.storage.markdown.
 * getMarkdown()` already reproduces the `---` fences - comparing it to the
 * whole incoming `content` is what lets this skip a rebuild when nothing
 * actually changed.
 *
 * `isOwnSync` tells an incoming change the editor caused from one it did not;
 * without it, every autosync would read as an external change.
 */
export function useFrontmatterDocument(
	editor: Editor | null,
	content: string,
	isOwnSync: (content: string) => boolean = neverOwnSync,
	fileKind: FileKind = 'markdown'
) {
	// Flipped after the first effect run (the mount pass), per editor *instance*
	// rather than per panel - `useSearchReveal`'s doc comment records why:
	// TipTap rebuilds the editor during startup, and a per-panel guard let the
	// discarded instance consume the one-shot meant for its replacement.
	//
	// Tied to the *pass*, not to whether that pass actually ran a transaction:
	// a note with no frontmatter matches the editor's initial doc immediately,
	// so the mount pass below returns before reaching `setContent` at all - if
	// the flag only flipped there, the next genuine external change would find
	// it still unset and get wrongly treated as the mount-time sync.
	const isMountPass = useRef(true)

	useEffect(() => {
		const wasMountPass = isMountPass.current
		isMountPass.current = false

		if (!editor || content === undefined) return
		// Matching is what retires older syncs, so it runs on every arrival, even ones skipped below.
		const isEcho = isOwnSync(content)
		// Loaded regardless on mount, which is what records each block's source
		// text - the constructor's own parse records none.
		if (!wasMountPass && editor.storage.markdown.getMarkdown() === content) {
			return
		}
		// `content` catches up to the editor by way of its own autosync, and by
		// then the author has usually typed on - so the doc no longer matches
		// what it synced a second ago, and the check above no longer covers it.
		// Rebuilding there would throw away those keystrokes and the caret with
		// them, for a change the editor is the source of.
		if (isEcho) return

		// An outside change is taken in block by block, leaving the blocks the
		// author is in the middle of editing alone. The mount-time load - or a
		// note that cannot be patched - replaces the whole document.
		//
		// The mount-time rebuild stays excluded from history: left undoable, it
		// put a phantom step ahead of the user's very first keystroke, so Ctrl+Z
		// on an untouched document cleared it. Every later rebuild is a genuine
		// external change instead, and is left undoable as one clean step -
		// otherwise it leaves the existing history stack referring to a document
		// this replacement just swapped out from under it, and the next Ctrl+Z
		// corrupts the document rather than reverting anything.
		if (!wasMountPass && patchNoteContent(editor, content, fileKind)) return
		loadNoteContent(editor, content, {
			fileKind,
			addToHistory: !wasMountPass,
		})
	}, [content, editor, isOwnSync, fileKind])
}
