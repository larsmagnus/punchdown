import type { Editor, EditorEvents } from '@tiptap/react'
import { useCallback, useEffect } from 'react'

import {
	hasUnsyncedChanges,
	recordSyncedNote,
} from '#src/editor/extensions/markdown/block-source/synced-blocks'
import { CONTENT_SYNC_META } from '#src/editor/extensions/transaction-filters'
import { useNoteSync } from '#src/hooks/use-note-sync'

type UseMarkdownAutosyncOptions = {
	editor: Editor | null
	syncContent: (content: string) => void
	/** Off while this editor is mounted but hidden behind the other mode - see
	 *  `EditorBody`. A hidden editor only ever changes by absorbing an incoming
	 *  content sync (`CONTENT_SYNC_META`, already skipped below), so this is
	 *  belt-and-braces against anything else that might one day dispatch a
	 *  transaction on it unattended. */
	enabled: boolean
	/** See `useNoteSync`'s option of the same name. */
	recordOwnSync: (content: string) => void
}

/**
 * Syncs the TipTap document into the `TextDocument` on every change,
 * frontmatter and all.
 *
 * Subscribes to the editor rather than taking an `onUpdate` handler, so nothing
 * has to be threaded back into `useEditor` before this hook has run.
 * Frontmatter is a real node in the document, so `getMarkdown()` alone
 * reproduces the whole file - there is no separate frontmatter state to stitch
 * back in before syncing.
 */
export function useMarkdownAutosync({
	editor,
	syncContent,
	enabled,
	recordOwnSync,
}: UseMarkdownAutosyncOptions) {
	const currentFile = useCallback(
		() => editor?.storage?.markdown?.getMarkdown() ?? null,
		[editor]
	)

	// What reaches the file is the file's text again - see `recordSyncedNote`.
	const syncAndRecord = useCallback(
		(content: string) => {
			if (editor) recordSyncedNote(editor, content)
			syncContent(content)
		},
		[editor, syncContent]
	)
	const recordOwnSyncAndBlocks = useCallback(
		(content: string) => {
			if (editor) recordSyncedNote(editor, content)
			recordOwnSync(content)
		},
		[editor, recordOwnSync]
	)

	const { queueSync, cancelQueuedSync, flushQueuedSync } = useNoteSync({
		syncContent: syncAndRecord,
		currentFile,
		active: enabled,
		recordOwnSync: recordOwnSyncAndBlocks,
	})

	useEffect(() => {
		if (!editor || !enabled) return

		const queueCurrentDocument = ({ transaction }: EditorEvents['update']) => {
			// The host's own text, not the author's. Writing it back would replace
			// the file with this editor's re-serialization of it - unless the
			// author's own unsynced edits survived it (`patchNoteContent`), which
			// still have to reach the file.
			if (transaction.getMeta(CONTENT_SYNC_META)) {
				if (hasUnsyncedChanges(editor)) {
					queueSync(editor.storage.markdown.getMarkdown())
				} else {
					cancelQueuedSync()
				}
				return
			}

			queueSync(editor.storage?.markdown?.getMarkdown() ?? '')
		}

		editor.on('update', queueCurrentDocument)
		return () => {
			editor.off('update', queueCurrentDocument)
		}
	}, [cancelQueuedSync, editor, enabled, queueSync])

	return { flushQueuedSync }
}
