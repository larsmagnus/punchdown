import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNoteSync } from '#src/hooks/use-note-sync'
import { documentDirty } from '#src/lib/document-dirty-tracker'

const SYNC_DEBOUNCE_MS = 1000

beforeEach(() => {
	vi.useFakeTimers()
	// Marked dirty by default: most tests below are about the debounce, not
	// about the immediate-sync-on-first-edit behaviour, which has its own
	// describe block that manages this explicitly.
	documentDirty.current = true
	window.vscode = {
		postMessage: vi.fn(),
		getState: vi.fn(),
		setState: vi.fn(),
	}
})

afterEach(() => {
	delete window.vscode
	vi.useRealTimers()
	vi.clearAllMocks()
	documentDirty.current = false
})

/** Lets the debounce elapse without waiting on a real second. */
function runDebounce() {
	act(() => {
		vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)
	})
}

describe('useNoteSync', () => {
	/**
	 * The debounce used to be seeded with `''` and guarded with a truthiness
	 * check, so a note the author had emptied looked identical to a note that had
	 * never been typed into - and deleting everything silently never synced.
	 */
	it('syncs a note the author has emptied', () => {
		const syncContent = vi.fn()
		renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '',
				active: true,
				recordOwnSync: vi.fn(),
			})
		).result.current.queueSync('')

		runDebounce()

		expect(syncContent).toHaveBeenCalledWith('')
	})

	it('syncs a note emptied down to its frontmatter', () => {
		const syncContent = vi.fn()
		const emptied = '---\ntitle: Roadmap\n---\n\n'

		renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => emptied,
				active: true,
				recordOwnSync: vi.fn(),
			})
		).result.current.queueSync(emptied)

		runDebounce()

		expect(syncContent).toHaveBeenCalledWith(emptied)
	})

	it('does not sync anything before the first edit', () => {
		const syncContent = vi.fn()

		renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		runDebounce()

		expect(syncContent).not.toHaveBeenCalled()
	})

	it('coalesces a burst of keystrokes into one sync', () => {
		const syncContent = vi.fn()
		const { result } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap 2026',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		result.current.queueSync('# Road')
		result.current.queueSync('# Roadmap')
		result.current.queueSync('# Roadmap 2026')
		runDebounce()

		expect(syncContent).toHaveBeenCalledTimes(1)
		expect(syncContent).toHaveBeenCalledWith('# Roadmap 2026')
	})

	it('waits for the pause before syncing', () => {
		const syncContent = vi.fn()
		const { result } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		result.current.queueSync('# Roadmap')
		act(() => {
			vi.advanceTimersByTime(SYNC_DEBOUNCE_MS - 100)
		})

		expect(syncContent).not.toHaveBeenCalled()
	})

	it('syncs through the given syncContent without a VS Code host', () => {
		delete window.vscode
		const syncContent = vi.fn()
		renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap',
				active: true,
				recordOwnSync: vi.fn(),
			})
		).result.current.queueSync('# Roadmap')

		runDebounce()

		expect(syncContent).toHaveBeenCalledWith('# Roadmap')
	})

	// Switching from the live editor to the raw editor unmounts this hook's
	// caller. The debounce library cancels its own pending timer on unmount, so
	// an edit made in the second before the switch used to vanish silently -
	// the raw view then opened on the pre-edit document, not what was just typed.
	it('flushes a pending sync when unmounted before the debounce fires', () => {
		const syncContent = vi.fn()
		const { result, unmount } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap\n\nShip it. Today.',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		result.current.queueSync('# Roadmap\n\nShip it. Today.')
		unmount()

		expect(syncContent).toHaveBeenCalledWith('# Roadmap\n\nShip it. Today.')
	})

	it('flushes a pending sync on unmount without a VS Code host', () => {
		delete window.vscode
		const syncContent = vi.fn()
		const { result, unmount } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap\n\nShip it. Today.',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		result.current.queueSync('# Roadmap\n\nShip it. Today.')
		unmount()

		expect(syncContent).toHaveBeenCalledWith('# Roadmap\n\nShip it. Today.')
	})

	// Both editor modes stay mounted at once (`EditorBody`), so a view that
	// hides itself instead of unmounting has to flush explicitly, or a
	// keystroke made just before switching away is stuck behind a debounce
	// nothing is left to fire.
	it('flushes a pending sync immediately when asked to', () => {
		const syncContent = vi.fn()
		const { result } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap\n\nShip it. Today.',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		result.current.queueSync('# Roadmap\n\nShip it. Today.')
		act(() => {
			result.current.flushQueuedSync()
		})

		expect(syncContent).toHaveBeenCalledWith('# Roadmap\n\nShip it. Today.')

		syncContent.mockClear()
		runDebounce()
		expect(syncContent).not.toHaveBeenCalled()
	})

	it('does nothing when flushed with nothing pending', () => {
		const syncContent = vi.fn()
		const { result } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => '# Roadmap',
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		act(() => {
			result.current.flushQueuedSync()
		})

		expect(syncContent).not.toHaveBeenCalled()
	})

	it('does not flush on unmount when nothing was ever typed', () => {
		const syncContent = vi.fn()
		const { unmount } = renderHook(() =>
			useNoteSync({
				syncContent,
				currentFile: () => null,
				active: true,
				recordOwnSync: vi.fn(),
			})
		)

		unmount()

		expect(syncContent).not.toHaveBeenCalled()
	})

	/**
	 * VS Code does not save a clean document - a keystroke landing inside the
	 * debounce window, before anything has reached the `TextDocument`, would
	 * make Cmd/Ctrl+S (and `files.autoSave`) silently do nothing.
	 */
	describe('syncing the first edit since a clean state immediately', () => {
		beforeEach(() => {
			documentDirty.current = false
		})

		it('syncs immediately, ahead of the debounce', () => {
			const syncContent = vi.fn()
			const { result } = renderHook(() =>
				useNoteSync({
					syncContent,
					currentFile: () => '# Roadmap',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)

			result.current.queueSync('# Roadmap 2026')

			expect(syncContent).toHaveBeenCalledWith('# Roadmap 2026')
		})

		it('marks the document dirty, so a second edit waits for the debounce as usual', () => {
			const syncContent = vi.fn()
			const { result } = renderHook(() =>
				useNoteSync({
					syncContent,
					currentFile: () => '# Roadmap',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)

			result.current.queueSync('# Road')
			syncContent.mockClear()
			result.current.queueSync('# Roadmap')

			expect(syncContent).not.toHaveBeenCalled()
		})

		it('does nothing immediately once the document is already dirty', () => {
			documentDirty.current = true
			const syncContent = vi.fn()
			const { result } = renderHook(() =>
				useNoteSync({
					syncContent,
					currentFile: () => '# Roadmap',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)

			result.current.queueSync('# Roadmap 2026')

			expect(syncContent).not.toHaveBeenCalled()
		})

		// Standalone there is no `TextDocument` for VS Code to consider clean or
		// dirty, and no save command competing with the debounce either.
		it('does not sync immediately outside VSCode', () => {
			delete window.vscode
			const syncContent = vi.fn()
			const { result } = renderHook(() =>
				useNoteSync({
					syncContent,
					currentFile: () => '# Roadmap',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)

			result.current.queueSync('# Roadmap 2026')

			expect(syncContent).not.toHaveBeenCalled()
		})
	})

	/**
	 * `onWillSaveTextDocument` (`save-participant.ts`) asks the active view for
	 * its current text ahead of a save, since the last debounced sync can be up
	 * to a second behind whatever was just typed.
	 */
	describe('answering a request for the current text', () => {
		function requestLatest(requestId: string) {
			act(() => {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: { type: 'requestLatest', requestId },
					})
				)
			})
		}

		it('replies with the current file when an edit is pending', () => {
			const postMessage = vi.fn()
			window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

			const { result } = renderHook(() =>
				useNoteSync({
					syncContent: vi.fn(),
					currentFile: () => '# Roadmap 2026',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)
			act(() => result.current.queueSync('# Roadmap 2026'))
			postMessage.mockClear()

			requestLatest('req-1')

			expect(postMessage).toHaveBeenCalledWith({
				type: 'latestContent',
				requestId: 'req-1',
				content: '# Roadmap 2026',
			})
		})

		/**
		 * Nothing pending means the document already holds this view's text -
		 * either it was already synced, or the current state is only a freshly
		 * absorbed external change nobody typed. Answering with `currentFile()`
		 * regardless would write this view's own re-serialization of that
		 * external change (escaping a footnote, say, or dropping a trailing
		 * newline) straight back over it, so the reply is `null` instead.
		 */
		it('replies with null when nothing is pending', () => {
			const postMessage = vi.fn()
			window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

			renderHook(() =>
				useNoteSync({
					syncContent: vi.fn(),
					currentFile: () => '# Roadmap 2026',
					active: true,
					recordOwnSync: vi.fn(),
				})
			)

			requestLatest('req-1')

			expect(postMessage).toHaveBeenCalledWith({
				type: 'latestContent',
				requestId: 'req-1',
				content: null,
			})
		})

		/**
		 * `syncContent` is a real write - for the live editor, it round-trips
		 * through TipTap's own re-serialization, which escapes syntax it has no
		 * node for (a footnote, say). Calling it here to satisfy the save would
		 * overwrite a file nobody actually asked to change; `recordOwnSync` marks
		 * the text as this view's own without writing anything.
		 */
		it('records the reply as its own without syncing it', () => {
			const syncContent = vi.fn()
			const recordOwnSync = vi.fn()
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}

			const { result } = renderHook(() =>
				useNoteSync({
					syncContent,
					currentFile: () => '# Roadmap 2026',
					active: true,
					recordOwnSync,
				})
			)
			act(() => result.current.queueSync('# Roadmap 2026'))
			syncContent.mockClear()

			requestLatest('req-1')

			expect(recordOwnSync).toHaveBeenCalledWith('# Roadmap 2026')
			expect(syncContent).not.toHaveBeenCalled()
		})

		// The inactive view's held text can lag the debounce by up to a second -
		// answering with it would tell the save stale content.
		it('stays silent while inactive', () => {
			const postMessage = vi.fn()
			window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

			const { result } = renderHook(() =>
				useNoteSync({
					syncContent: vi.fn(),
					currentFile: () => '# Roadmap 2026',
					active: false,
					recordOwnSync: vi.fn(),
				})
			)
			act(() => result.current.queueSync('# Roadmap 2026'))
			postMessage.mockClear()

			requestLatest('req-1')

			expect(postMessage).not.toHaveBeenCalled()
		})

		it('stays silent when the editor has not finished mounting', () => {
			const postMessage = vi.fn()
			window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

			const { result } = renderHook(() =>
				useNoteSync({
					syncContent: vi.fn(),
					currentFile: () => null,
					active: true,
					recordOwnSync: vi.fn(),
				})
			)
			act(() => result.current.queueSync('anything'))
			postMessage.mockClear()

			requestLatest('req-1')

			expect(postMessage).not.toHaveBeenCalled()
		})
	})
})
