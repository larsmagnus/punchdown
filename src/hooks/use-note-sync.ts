import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { useDebounceValue } from 'usehooks-ts'

import { useHostMessage } from '#src/hooks/use-host-message'
import { documentDirty } from '#src/lib/document-dirty-tracker'
import { host } from '#src/lib/webview-host'

const SYNC_DEBOUNCE_MS = 1000

type UseNoteSyncOptions = {
	syncContent: (content: string) => void
	/**
	 * The whole file as it stands right now - for the first sync since a clean
	 * state, and for answering `requestLatest`. `null` means the caller has
	 * nothing to write yet.
	 */
	currentFile: () => string | null
	/** Whether this is the view currently on screen - see `EditorBody`. Only
	 *  the active view answers `requestLatest`; the inactive one's held text
	 *  can lag the debounce and would answer with stale content. */
	active: boolean
	/**
	 * Marks a `requestLatest` answer as this view's own, without syncing it -
	 * `syncContent` would work too, but it is a real write, and a save must
	 * never turn "what do you currently hold" into "write that back": the
	 * live editor's re-serialization of syntax it does not support (a
	 * footnote, say) would overwrite a file nobody actually asked it to
	 * change.
	 */
	recordOwnSync: (content: string) => void
}

/**
 * Syncs the note into the `TextDocument`, debounced.
 *
 * Takes the whole file rather than a document, so both the rich editor and the
 * raw markdown view can share one sync path - the frontmatter split is the rich
 * editor's business and has already happened by the time text arrives here.
 */
export function useNoteSync({
	syncContent,
	currentFile,
	active,
	recordOwnSync,
}: UseNoteSyncOptions) {
	// Seeded `null` rather than `''` so that emptying a note still syncs; an
	// empty string is a legitimate document, not the absence of one.
	const [debouncedValue, debouncedQueueSync] = useDebounceValue<string | null>(
		null,
		SYNC_DEBOUNCE_MS
	)

	// The debounce library cancels its pending timer the instant this hook
	// unmounts. Tracking the pending edit here lets the unmount flush below
	// still write it, instead of losing it with the timer.
	const pendingRef = useRef(false)
	const queueSync = useCallback(
		(next: string) => {
			pendingRef.current = true

			// VS Code does not save a clean document, so the very first edit since
			// the last save has to reach the `TextDocument` immediately - left to
			// the debounce, Cmd/Ctrl+S (or `files.autoSave`) landing inside that
			// window would find nothing dirty yet and silently do nothing.
			if (host.isVSCode && !documentDirty.current) {
				documentDirty.current = true
				syncContent(next)
			}

			debouncedQueueSync(next)
		},
		[debouncedQueueSync, syncContent]
	)

	// Answers a VS Code save's `onWillSaveTextDocument` participant, which
	// otherwise only has the last debounced sync - up to one debounce behind
	// whatever was just typed.
	useHostMessage(
		'requestLatest',
		(message) => {
			// Nothing pending means the document already holds this view's
			// correct text - either it was already synced, or the current state
			// is only a freshly absorbed external change nobody typed. Answering
			// with `currentFile()` regardless would write this view's own
			// re-serialization of that external change (escaping a footnote,
			// say, or dropping its trailing newline) straight back over it.
			if (!pendingRef.current) {
				host.send({
					type: 'latestContent',
					requestId: message.requestId,
					content: null,
				})
				return
			}

			const file = currentFile()
			if (file === null) return

			// Recorded, not synced - the host may echo this text back (e.g.
			// touched up by a save hook), and without recording it here that echo
			// reads as an external change and rebuilds the document.
			recordOwnSync(file)

			host.send({
				type: 'latestContent',
				requestId: message.requestId,
				content: file,
			})
		},
		host.isVSCode && active
	)

	useEffect(() => {
		if (debouncedValue === null) return
		pendingRef.current = false

		syncContent(debouncedValue)
	}, [debouncedValue, syncContent])

	// An effect event rather than effect dependencies: an inline
	// `currentFile`/`syncContent` is a new identity every render, and depending
	// on them directly would run the flush effect's cleanup on every re-render
	// the debounce firing causes - racing the effect above that clears
	// `pendingRef`, since React runs a commit's cleanups before its new effects
	// regardless of hook order.
	//
	// On unmount, the cancelled timer's pending write is made directly instead.
	const flushPendingSync = useEffectEvent(() => {
		if (!pendingRef.current) return
		const file = currentFile()
		if (file === null) return

		syncContent(file)
	})

	// Empty deps so this only runs on the hook's actual unmount, not on every
	// render.
	useEffect(() => {
		return () => flushPendingSync()
	}, [])

	const cancelQueuedSync = useCallback(() => {
		pendingRef.current = false
		debouncedQueueSync.cancel()
	}, [debouncedQueueSync])

	// Editor modes stay mounted behind one another (`EditorBody`), so a toggle
	// never unmounts this hook and the flush-on-unmount above does not run. A
	// caller that hides its own view has to flush explicitly, or a keystroke
	// made just before switching away waits on a debounce nothing will fire.
	// `.flush()` is a no-op when nothing is pending.
	const flushQueuedSync = useCallback(() => {
		pendingRef.current = false
		debouncedQueueSync.flush()
	}, [debouncedQueueSync])

	return { queueSync, cancelQueuedSync, flushQueuedSync }
}
