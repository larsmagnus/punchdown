import { describe, expect, it } from 'vitest'

import { createOwnSyncTracker } from '#src/lib/own-sync-tracker'

describe('createOwnSyncTracker', () => {
	it('recognises the exact text it was told about', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.')

		expect(tracker.matches('# Roadmap\n\nShip it.')).toBe(true)
	})

	it('does not recognise text it was never told about', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.')

		expect(tracker.matches('# Roadmap\n\nShip it tomorrow.')).toBe(false)
	})

	it('recognises nothing before anything has been recorded', () => {
		const tracker = createOwnSyncTracker()

		expect(tracker.matches('# Roadmap')).toBe(false)
	})

	/**
	 * `files.trimTrailingWhitespace` strips trailing spaces and tabs from every
	 * line, and `files.insertFinalNewline` adds a trailing newline if the file
	 * has none - both run as part of VS Code's own save, after the sync this
	 * text came from. Recognising the touched-up result as still our own is
	 * what stops it from reading as an external change and rebuilding the
	 * document a keystroke later.
	 */
	it('recognises its own text after trailing whitespace is trimmed', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap  \n\nShip it.\t\n')

		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(true)
	})

	it('recognises its own text after a final newline is inserted', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.')

		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(true)
	})

	// Existing multiple trailing blank lines are real content, not something
	// either save hook touches - only a *missing* final newline is added.
	it('still tells apart texts that differ only by extra trailing blank lines', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.\n')

		expect(tracker.matches('# Roadmap\n\nShip it.\n\n\n')).toBe(false)
	})

	// Two panels on the same document both post `syncDocument`, so panel B has
	// to recognise panel A's write reaching it as an `update` too - the two
	// would otherwise fight, each rebuilding the other's text back to its own.
	it('remembers more than the single most recent sync', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.')
		tracker.record('# Roadmap\n\nShip it today.')

		expect(tracker.matches('# Roadmap\n\nShip it.')).toBe(true)
		expect(tracker.matches('# Roadmap\n\nShip it today.')).toBe(true)
	})

	it('forgets a sync old enough to have been pushed out of the window', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('draft 1')
		tracker.record('draft 2')
		tracker.record('draft 3')
		tracker.record('draft 4')
		tracker.record('draft 5')
		tracker.record('draft 6')

		expect(tracker.matches('draft 1')).toBe(false)
		expect(tracker.matches('draft 6')).toBe(true)
	})

	// Echoes return in send order, so an older text matching after a newer echo
	// is another writer returning to it, such as an undo in the other mode.
	it('stops recognising older syncs once a newer one has come back', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n')
		tracker.record('# Roadmap\n\nShip it.\n')
		expect(tracker.matches('# Roadmap\n')).toBe(true)
		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(true)

		expect(tracker.matches('# Roadmap\n')).toBe(false)
	})

	it('keeps recognising the newest sync after it has come back', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n\nShip it.  \n')
		expect(tracker.matches('# Roadmap\n\nShip it.  \n')).toBe(true)

		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(true)
	})

	it('stops recognising its echoed text once someone else’s arrives', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n')
		expect(tracker.matches('# Roadmap\n')).toBe(true)
		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(false)

		expect(tracker.matches('# Roadmap\n')).toBe(false)
	})

	it('still recognises a sync whose echo has not arrived when someone else’s text does', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n')
		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(false)

		expect(tracker.matches('# Roadmap\n')).toBe(true)
	})

	it('retires everything before the latest copy of a text synced twice', () => {
		const tracker = createOwnSyncTracker()

		tracker.record('# Roadmap\n')
		tracker.record('# Roadmap\n\nShip it.\n')
		tracker.record('# Roadmap\n')
		expect(tracker.matches('# Roadmap\n')).toBe(true)

		expect(tracker.matches('# Roadmap\n\nShip it.\n')).toBe(false)
	})
})
