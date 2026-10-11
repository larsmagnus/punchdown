import { describe, expect, it } from 'vitest'

import { findPathQuery } from '#src/lib/path-completion/find-path-query'

describe('findPathQuery', () => {
	describe('in a link target', () => {
		it('opens on an empty target, listing the note’s own folder', () => {
			expect(findPathQuery('See [the plan](')).toEqual({
				from: 15,
				directory: '',
				query: '',
				context: 'link',
			})
		})

		it('reads the segment typed so far as the query', () => {
			expect(findPathQuery('See [the plan](pla')).toEqual({
				from: 15,
				directory: '',
				query: 'pla',
				context: 'link',
			})
		})

		it('opens in an image source', () => {
			expect(findPathQuery('![Diagram](assets/arch')).toEqual({
				from: 18,
				directory: 'assets/',
				query: 'arch',
				context: 'link',
			})
		})

		it('lists a nested folder', () => {
			expect(findPathQuery('[spec](docs/adr/')).toEqual({
				from: 16,
				directory: 'docs/adr/',
				query: '',
				context: 'link',
			})
		})

		it('keeps a leading slash, which anchors at the workspace folder', () => {
			expect(findPathQuery('[readme](/READ')).toEqual({
				from: 10,
				directory: '/',
				query: 'READ',
				context: 'link',
			})
		})

		it('keeps ./ as typed', () => {
			expect(findPathQuery('[](./')).toEqual({
				from: 5,
				directory: './',
				query: '',
				context: 'link',
			})
		})

		it('keeps ../ as typed', () => {
			expect(findPathQuery('[](../shared/no')).toEqual({
				from: 13,
				directory: '../shared/',
				query: 'no',
				context: 'link',
			})
		})

		it('decodes percent-encoded spaces', () => {
			expect(findPathQuery('[](meeting%20notes/q3%20pl')).toEqual({
				from: 19,
				directory: 'meeting notes/',
				query: 'q3 pl',
				context: 'link',
			})
		})

		it('matches a half-typed escape as typed', () => {
			expect(findPathQuery('[](q3%2')).toMatchObject({ query: 'q3%2' })
		})

		it('offers nothing once the target is closed', () => {
			expect(findPathQuery('[plan](plan.md) and')).toBeNull()
		})

		it('offers nothing once a title starts', () => {
			expect(findPathQuery('[plan](plan.md "Pl')).toBeNull()
		})

		it('offers nothing for a URL', () => {
			expect(findPathQuery('[site](https://exa')).toBeNull()
		})

		it('offers nothing for a mail link', () => {
			expect(findPathQuery('[mail](mailto:team')).toBeNull()
		})

		it('offers nothing for a protocol-relative URL', () => {
			expect(findPathQuery('[cdn](//cdn.example.com/')).toBeNull()
		})

		it('round-trips a literal percent sign written as %25', () => {
			expect(findPathQuery('[](100%25')).toMatchObject({ query: '100%' })
		})

		it('offers nothing for an anchor', () => {
			expect(findPathQuery('[setup](notes.md#inst')).toBeNull()
		})

		it('offers nothing in plain prose', () => {
			expect(findPathQuery('Read the plan (soon')).toBeNull()
		})
	})

	describe('in inline code', () => {
		it('reads the text after an open backtick', () => {
			expect(findPathQuery('Run `src/ho')).toEqual({
				from: 9,
				directory: 'src/',
				query: 'ho',
				context: 'code',
			})
		})

		it('takes names as typed, without decoding', () => {
			expect(findPathQuery('`q3%20pl')).toMatchObject({ query: 'q3%20pl' })
		})

		it('offers nothing right after the backtick, before anything is typed', () => {
			expect(findPathQuery('Run `')).toBeNull()
		})

		it('offers nothing once the code holds a space', () => {
			expect(findPathQuery('Run `pnpm te')).toBeNull()
		})

		it('offers nothing once the span is closed', () => {
			expect(findPathQuery('Edit `package.json` to')).toBeNull()
		})

		it('opens in a second span after a closed one', () => {
			expect(findPathQuery('`a.ts` and `b')).toMatchObject({
				query: 'b',
				context: 'code',
			})
		})

		it('offers nothing in a double-backtick span', () => {
			expect(findPathQuery('``src')).toBeNull()
		})

		it('offers nothing in a triple-backtick span', () => {
			expect(findPathQuery('```src')).toBeNull()
		})

		it('keeps a span open past a run of a different length', () => {
			expect(findPathQuery('`a``b')).toMatchObject({ query: 'a``b' })
		})

		it('closes a span on a backslashed backtick, which escapes nothing inside one', () => {
			expect(findPathQuery('`src\\` and')).toBeNull()
		})

		it('skips an escaped backtick outside a span', () => {
			expect(findPathQuery('A \\` then text')).toBeNull()
		})

		it('treats link syntax inside a span as code', () => {
			expect(findPathQuery('`[x](src')).toMatchObject({
				directory: '',
				query: '[x](src',
				context: 'code',
			})
		})
	})
})
