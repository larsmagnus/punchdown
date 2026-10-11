import { describe, expect, it, vi } from 'vitest'

import { ensureLanguage, getHighlighter } from '#src/lib/shiki-highlighter'
import {
	findLanguageImporter,
	SHIKI_LANGUAGES,
} from '#src/lib/shiki-language-map'

describe('findLanguageImporter', () => {
	it('is case-insensitive', () => {
		expect(findLanguageImporter('TypeScript')).toBe(
			findLanguageImporter('typescript')
		)
	})

	it('returns undefined for an unknown language', () => {
		expect(findLanguageImporter('not-a-real-language')).toBeUndefined()
	})

	it('returns undefined for an empty tag', () => {
		expect(findLanguageImporter('')).toBeUndefined()
	})
})

describe('ensureLanguage', () => {
	it('should load a grammar once when called concurrently for the same tag', async () => {
		const highlighter = await getHighlighter()
		const loadLanguage = vi.spyOn(highlighter, 'loadLanguage')

		await Promise.all([
			ensureLanguage(highlighter, 'rust'),
			ensureLanguage(highlighter, 'rust'),
		])

		expect(loadLanguage).toHaveBeenCalledTimes(1)
		loadLanguage.mockRestore()
	})
})

/**
 * Every tag, not a sample: a fence tag is only usable if the grammar it points
 * at also answers to it, and that holds through the grammar's own `aliases`
 * rather than anything this map controls. `sh` reaching the `bash` grammar,
 * `dockerfile` the `docker` one and `c++` the `cpp` one are all that kind of
 * indirection, and any of them can break under a `@shikijs/langs` upgrade with
 * no change on this side.
 */
describe('every mapped fence tag tokenizes', () => {
	it.each(Object.keys(SHIKI_LANGUAGES))('%s', async (tag) => {
		const highlighter = await getHighlighter()

		expect(await ensureLanguage(highlighter, tag)).toBe(tag)
		expect(() =>
			highlighter.codeToTokensBase('name = 1', { lang: tag, theme: 'none' })
		).not.toThrow()
	})
})
