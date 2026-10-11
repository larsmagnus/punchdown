import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { useRawSyntaxHighlight } from '#src/hooks/use-raw-syntax-highlight'

const testTheme = { themeId: 'test-theme', kind: 'dark', raw: null }
vi.mock('#src/hooks/use-shiki-theme', () => ({
	useShikiTheme: () => testTheme,
}))

vi.mock('#src/lib/shiki-highlighter', () => ({
	getThemedHighlighter: async () => ({
		highlighter: {},
		themeId: 'test-theme',
	}),
	ensureLanguage: async () => 'yaml',
}))

// Every word gets a token colored with its block's language name, and
// `unknown` has no grammar, so a body's color shows which grammar it went to.
vi.mock('#src/lib/syntax-highlight-tokens', () => ({
	tokenizeBlock: async (
		_highlighter: unknown,
		block: { text: string; language: string }
	) =>
		[...block.text.matchAll(/\S+/g)]
			.filter(() => block.language !== 'unknown')
			.map((match) => ({
				offset: match.index,
				length: match[0].length,
				color: block.language,
			})),
}))

it('colors each fence body with its own language, and an unknown one as markdown', async () => {
	const languages = ['js', 'html', 'sh', 'mermaid', 'unknown']
	const draft = languages
		.map((language) => `\`\`\`${language}\nbody-${language}\n\`\`\`\n`)
		.join('\n')

	const { result } = renderHook(() => useRawSyntaxHighlight(draft, true))
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 300))
	})

	const bodyColors = languages.map(
		(language) =>
			result.current.find(
				(token) => token.offset === draft.indexOf(`body-${language}`)
			)?.color
	)
	expect(bodyColors).toEqual(['js', 'html', 'sh', 'mermaid', 'markdown'])
})
