import { describe, expect, it } from 'vitest'

import { buildSearchJump } from '#src/host/search-jump'

/**
 * Positions mirror `public/other-note.md`, whose frontmatter occupies eight
 * source lines - so the `<input` match search reports on source line 67
 * (line 66 counting from zero) is body line 58.
 */
describe('buildSearchJump', () => {
	it('shifts the match into body coordinates and carries its text', () => {
		const matches = [
			{
				line: 66,
				column: 1,
				lineText: '\t<input id="email" name="email" type="email" required />',
			},
			{ line: 122, column: 2, lineText: '\t\t<input value="second" />' },
		]

		expect(
			buildSearchJump({ matches, allMatches: matches, lineOffset: 8 })
		).toEqual({ line: 58, column: 1, text: '<input ', lineOffset: 8 })
	})

	/**
	 * The whole point of `allMatches`. A note holding the search's only hit has
	 * nothing to measure the query against, so on its own it reports the rest of
	 * the line as the match - a highlight running fifty characters long. Matches
	 * in unrelated files are what cut it back to the query.
	 */
	it('measures the query against matches in other files', () => {
		const own = [
			{
				line: 66,
				column: 1,
				lineText: '\t<input id="email" name="email" type="email" required />',
			},
		]

		expect(
			buildSearchJump({ matches: own, allMatches: own, lineOffset: 8 })?.text
		).toBe('<input id="email" name="email" type="email" required />')

		expect(
			buildSearchJump({
				matches: own,
				allMatches: [
					...own,
					{ line: 12, column: 2, lineText: '\t\t<Input' },
					{ line: 7, column: 2, lineText: '\t\t<InputPrimitive' },
				],
				lineOffset: 8,
			})?.text
		).toBe('<input')
	})

	it('leaves the line untouched for a note with no frontmatter', () => {
		const matches = [
			{ line: 3, column: 0, lineText: 'Email, and more' },
			{ line: 9, column: 4, lineText: 'the email field' },
		]

		expect(
			buildSearchJump({ matches, allMatches: matches, lineOffset: 0 })
		).toEqual({ line: 3, column: 0, text: 'Email', lineOffset: 0 })
	})

	it('skips a match inside the frontmatter, which the editor never received', () => {
		const matches = [
			{ line: 4, column: 7, lineText: 'tags: [testing, markdown, images]' },
			{ line: 40, column: 0, lineText: 'testing the rendered body' },
		]

		expect(
			buildSearchJump({ matches, allMatches: matches, lineOffset: 8 })
		).toEqual({ line: 32, column: 0, text: 'testing', lineOffset: 8 })
	})

	it('jumps to nothing when every match sits in the frontmatter', () => {
		const matches = [{ line: 1, column: 7, lineText: 'title: Second Fixture' }]

		expect(
			buildSearchJump({ matches, allMatches: matches, lineOffset: 8 })
		).toBeUndefined()
	})

	it('jumps to nothing for a note the search did not match', () => {
		expect(
			buildSearchJump({ matches: [], allMatches: [], lineOffset: 8 })
		).toBeUndefined()
	})

	/** A regex search, whose matches share no common prefix to measure. */
	it('jumps to nothing when the matches pin down no query at all', () => {
		const matches = [
			{ line: 40, column: 0, lineText: 'alpha' },
			{ line: 41, column: 0, lineText: 'beta' },
		]

		expect(
			buildSearchJump({ matches, allMatches: matches, lineOffset: 0 })
		).toBeUndefined()
	})
})
