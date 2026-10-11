import { describe, expect, it } from 'vitest'

import { findRawPathQuery } from '#src/lib/path-completion/find-raw-path-query'

describe('findRawPathQuery', () => {
	it('offsets into the whole text, not just the caret’s line', () => {
		const text = '# Notes\n\nSee [plan](pl'

		expect(findRawPathQuery(text, text.length)).toEqual({
			from: 20,
			directory: '',
			query: 'pl',
			context: 'link',
		})
	})

	it('reads only up to the caret', () => {
		const text = 'See [plan](plan.md)'

		expect(findRawPathQuery(text, 13)).toMatchObject({ query: 'pl' })
	})

	it('offers nothing inside a fenced code block', () => {
		const text = '```js\nconst path = `src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})

	it('opens again after a fenced code block closes', () => {
		const text = '```js\nlet a\n```\n\nEdit `src'

		expect(findRawPathQuery(text, text.length)).toMatchObject({
			query: 'src',
			context: 'code',
		})
	})

	it('keeps a ``` fence open past a ~~~ line inside it', () => {
		const text = '```md\n~~~\n`src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})

	it('keeps a fence open past a line with an info string', () => {
		const text = '```md\n```js\n`src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})

	it('keeps a four-backtick fence open past a three-backtick line', () => {
		const text = '````md\n```\n`src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})

	it('reads a fence indented by up to three spaces', () => {
		const text = '   ```js\n`src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})

	it('opens on the very first line', () => {
		expect(findRawPathQuery('`src', 4)).toMatchObject({ from: 1 })
	})

	it('keeps a ~~~ fence open past a ``` line inside it', () => {
		const text = '~~~md\n```\n`src'

		expect(findRawPathQuery(text, text.length)).toBeNull()
	})
})
