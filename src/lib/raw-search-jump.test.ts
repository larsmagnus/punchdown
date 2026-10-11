import { describe, expect, it } from 'vitest'

import { findRawSearchRange } from '#src/lib/raw-search-jump'

/**
 * Raw mode shows the whole file, frontmatter included, so the position search
 * reported applies directly once the host's subtraction is added back.
 */
describe('findRawSearchRange', () => {
	const source = [
		'---',
		'title: Second Fixture Note',
		'---',
		'',
		'# other-note.md',
		'',
		'\t<input id="email" required />',
	].join('\n')

	it('adds the frontmatter back to reach the offset in the whole file', () => {
		const range = findRawSearchRange(source, {
			// Body line 2, because the frontmatter took the first four.
			line: 2,
			column: 1,
			text: '<input',
			lineOffset: 4,
		})

		expect(range).not.toBeNull()
		expect(source.slice(range?.start, range?.end)).toBe('<input')
	})

	it('selects a match on the very first line of a note with no frontmatter', () => {
		const range = findRawSearchRange('<input id="first" />\nmore', {
			line: 0,
			column: 0,
			text: '<input',
			lineOffset: 0,
		})

		expect(range).toEqual({ start: 0, end: 6 })
	})

	/**
	 * The matched text is an upper bound, so it can run past the end of a short
	 * line - selecting into the next line would be visibly wrong.
	 */
	it('clamps a selection that runs past the end of its line', () => {
		const range = findRawSearchRange('short\nnext line here', {
			line: 0,
			column: 0,
			text: 'short and then some',
			lineOffset: 0,
		})

		expect(range).toEqual({ start: 0, end: 5 })
	})

	it('selects nothing when the file has changed and the line is gone', () => {
		const range = findRawSearchRange('one line only', {
			line: 40,
			column: 0,
			text: 'gone',
			lineOffset: 0,
		})

		expect(range).toBeNull()
	})

	it('selects nothing when the column is past the end of its line', () => {
		const range = findRawSearchRange('short\nnext', {
			line: 0,
			column: 40,
			text: 'gone',
			lineOffset: 0,
		})

		expect(range).toBeNull()
	})

	it('selects nothing when the payload carries no text', () => {
		const range = findRawSearchRange('anything', {
			line: 0,
			column: 0,
			text: '',
			lineOffset: 0,
		})

		expect(range).toBeNull()
	})
})
