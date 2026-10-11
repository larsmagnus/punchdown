import type { ChangeEvent, RefObject } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { useAdoptContentOnBlur } from '#src/hooks/use-adopt-content-on-blur'
import { useAdoptIncomingContent } from '#src/hooks/use-adopt-incoming-content'
import { useFlushOnDeactivate } from '#src/hooks/use-flush-on-deactivate'
import { useNoteSync } from '#src/hooks/use-note-sync'
import { useRawHistory } from '#src/hooks/use-raw-history'
import { OUTSIDE_CHANGE } from '#src/lib/text-history'
import type { TextHistoryStep } from '#src/lib/text-history'

interface RawDraftSyncOptions {
	content: string
	syncContent: (content: string) => void
	active: boolean
	textareaRef: RefObject<HTMLTextAreaElement | null>
}

/**
 * Owns raw mode's draft text and its autosync with the host document -
 * everything `EditorModeRaw` needs before it can render the textarea itself.
 */
export function useRawDraftSync({
	content,
	syncContent,
	active,
	textareaRef,
}: RawDraftSyncOptions) {
	const [draft, setDraft] = useState(content)

	// Written in a layout effect, not during render, so it only ever holds the
	// committed draft - and still lands before any passive effect reads it.
	const draftRef = useRef(draft)
	useLayoutEffect(() => {
		draftRef.current = draft
	}, [draft])

	// The text this view last agreed with the host about, from either direction:
	// what it took from `content`, or what it wrote back. A draft that still
	// matches it has nothing of the author's to lose.
	//
	// Both directions matter because `useHostDocument` applies each sync locally,
	// so `content` follows this view's own writes as well as outside edits -
	// tracking only what arrived would read an author who undid their way back
	// to the earlier text as having nothing pending.
	const adoptedRef = useRef(content)

	const currentFile = useCallback(() => draftRef.current, [])
	// This view's own echo check, parallel to `use-markdown-editor.ts`'s
	// `own-sync-tracker` rather than sharing it: `adoptedRef` already tells the
	// echo of this view's own write apart from an outside edit, and unlike the
	// live editor a stale match would only cost a redundant `setDraft` here,
	// not a document rebuild that drops keystrokes.
	const rememberSync = useCallback(
		(next: string) => {
			adoptedRef.current = next
			syncContent(next)
		},
		[syncContent]
	)
	const recordOwnSync = useCallback((next: string) => {
		adoptedRef.current = next
	}, [])
	const { queueSync, flushQueuedSync } = useNoteSync({
		syncContent: rememberSync,
		currentFile,
		active,
		recordOwnSync,
	})
	useFlushOnDeactivate(active, flushQueuedSync)

	/** Puts an undone or redone text on screen as the author's own edit, and syncs it. */
	const applyHistoryStep = useCallback(
		({ text, selection }: TextHistoryStep) => {
			// Committed first: React writing the new value would otherwise move the caret to the end.
			flushSync(() => setDraft(text))
			textareaRef.current?.setSelectionRange(selection.start, selection.end)
			queueSync(text)
		},
		[queueSync, textareaRef]
	)
	const recordHistory = useRawHistory({
		textareaRef,
		apply: applyHistoryStep,
	})

	/** Takes in text that reached this view from elsewhere, as one undoable step. */
	const adoptDraft = useCallback(
		(next: string) => {
			recordHistory(draftRef.current, next, OUTSIDE_CHANGE)
			setDraft(next)
		},
		[recordHistory]
	)

	useAdoptIncomingContent({
		content,
		draft,
		draftRef,
		adoptedRef,
		setDraft: adoptDraft,
		textareaRef,
	})

	const handleBlur = useAdoptContentOnBlur({
		content,
		draftRef,
		adoptedRef,
		setDraft: adoptDraft,
	})

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			recordHistory(draftRef.current, event.target.value)
			setDraft(event.target.value)
			queueSync(event.target.value)
		},
		[queueSync, recordHistory]
	)

	return { draft, draftRef, handleChange, handleBlur }
}
