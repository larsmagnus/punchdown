import { describe, expect, it } from 'vitest'

import { pathSuggestions } from '#src/lib/path-completion/path-suggestions'
import type { DirectoryEntry } from '#src/shared/messages'

const ENTRIES: DirectoryEntry[] = [
	{ name: 'tsconfig.json', kind: 'file' },
	{ name: 'README.md', kind: 'file' },
	{ name: 'src', kind: 'directory' },
	{ name: 'docs', kind: 'directory' },
	{ name: 'notes.md', kind: 'file' },
]

function labels(query: string) {
	return pathSuggestions(ENTRIES, { query, context: 'link' }).map(
		({ label }) => label
	)
}

describe('pathSuggestions', () => {
	it('lists folders first, then files, each alphabetically', () => {
		expect(labels('')).toEqual([
			'docs',
			'src',
			'notes.md',
			'README.md',
			'tsconfig.json',
		])
	})

	it('matches the query as a case-insensitive subsequence', () => {
		expect(labels('tcj')).toEqual(['tsconfig.json'])
	})

	it('puts names starting with the query ahead of other matches', () => {
		expect(labels('s')).toEqual(['src', 'docs', 'notes.md', 'tsconfig.json'])
	})

	it('lists nothing when nothing matches', () => {
		expect(labels('zzz')).toEqual([])
	})

	it('ranks a folder above a file even when only the file starts with the query', () => {
		expect(labels('r')).toEqual(['src', 'README.md'])
	})

	it('writes a folder with a trailing slash', () => {
		const [docs] = pathSuggestions(ENTRIES, { query: 'docs', context: 'link' })

		expect(docs.insert).toBe('docs/')
	})

	it('percent-encodes a link target', () => {
		const [entry] = pathSuggestions(
			[{ name: 'Q3 plan (draft) #2.md', kind: 'file' }],
			{ query: '', context: 'link' }
		)

		expect(entry.insert).toBe('Q3%20plan%20%28draft%29%20%232.md')
	})

	it('encodes a folder’s name but not its trailing slash', () => {
		const [entry] = pathSuggestions(
			[{ name: 'my docs (old)', kind: 'directory' }],
			{ query: '', context: 'link' }
		)

		expect(entry.insert).toBe('my%20docs%20%28old%29/')
	})

	it('encodes a literal percent sign and non-ASCII letters', () => {
		const [entry] = pathSuggestions([{ name: '100% café.md', kind: 'file' }], {
			query: '',
			context: 'link',
		})

		expect(entry.insert).toBe('100%25%20caf%C3%A9.md')
	})

	it('encodes a question mark and a colon, which would read as a query or a URL scheme', () => {
		const [entry] = pathSuggestions(
			[{ name: 'todo:later?.md', kind: 'file' }],
			{ query: '', context: 'link' }
		)

		expect(entry.insert).toBe('todo%3Alater%3F.md')
	})

	it('writes the name as it is in inline code', () => {
		const [entry] = pathSuggestions(
			[{ name: 'Q3 plan (draft) #2.md', kind: 'file' }],
			{ query: '', context: 'code' }
		)

		expect(entry.insert).toBe('Q3 plan (draft) #2.md')
	})
})
