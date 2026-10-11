import { useEffect, useMemo, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'

import { useShikiTheme } from '#src/hooks/use-shiki-theme'
import {
	findRawCodeFences,
	overlayFenceTokens,
} from '#src/lib/find-raw-code-fences'
import { remapRelativeTokens } from '#src/lib/remap-relative-tokens'
import type { RelativeToken } from '#src/lib/syntax-highlight-tokens'

/**
 * Far shorter than `use-document-revision.ts`'s 500ms, which also paces a
 * ProseMirror doc walk: this only needs to coalesce a fast typist's
 * individual keystrokes. A note heavy with code costs more per pass, since
 * every fence body is tokenized again in its own language.
 */
const HIGHLIGHT_DEBOUNCE_MS = 120

const NO_RESULT = { text: '', tokens: [] }

/**
 * Tokenizes the whole raw-mode draft with Shiki's `markdown` grammar, and
 * each fenced code block's body with its own language's, debounced the same
 * way the live editor's code-block highlighting is.
 *
 * There is no ProseMirror document here to draw decorations onto, so unlike
 * `useSyntaxHighlight` this hands the tokens back to the caller instead of
 * dispatching them anywhere - `EditorModeRaw` renders them into a highlighted
 * mirror behind the textarea (`RawMarkdownHighlight`).
 */
export function useRawSyntaxHighlight(
	draft: string,
	active: boolean
): RelativeToken[] {
	const theme = useShikiTheme()
	const [debouncedDraft] = useDebounceValue(draft, HIGHLIGHT_DEBOUNCE_MS)
	// Tracks which text `tokens` was tokenized against, alongside the tokens
	// themselves - `debouncedDraft` lags `draft` by up to the debounce window,
	// so a stale set applied to the live `draft` would color the wrong
	// characters rather than merely being late.
	const [result, setResult] = useState<{
		text: string
		tokens: RelativeToken[]
	}>(NO_RESULT)

	// An emptied note has nothing left to tokenize, so the last pass is
	// forgotten during render; otherwise its colors would be remapped onto
	// whatever the author types next.
	if (active && !debouncedDraft && result !== NO_RESULT) {
		setResult(NO_RESULT)
	}

	useEffect(() => {
		// Hidden behind live mode (`EditorBody`) - nobody can see the colors, and
		// tokenizing there would only spend the highlighter's time on a document
		// that only ever changes by absorbing a content sync.
		if (!active) return

		if (!debouncedDraft) return

		let cancelled = false

		const run = async () => {
			const { ensureLanguage, getThemedHighlighter } =
				await import('#src/lib/shiki-highlighter')
			if (cancelled) return

			const { highlighter, themeId } = await getThemedHighlighter(theme)
			if (cancelled) return

			// The `markdown` grammar's frontmatter rule embeds `source.yaml` -
			// that embedding only resolves into real tokens once the `yaml`
			// grammar is registered on the (shared, singleton) highlighter. Load
			// it explicitly rather than depending on the live editor happening to
			// have tokenized a frontmatter/yaml block first - otherwise a note
			// opened straight into raw mode shows only the frontmatter's fences
			// colored, not its keys and values, until something else loads yaml.
			await ensureLanguage(highlighter, 'yaml')
			if (cancelled) return

			const { tokenizeBlock } = await import('#src/lib/syntax-highlight-tokens')
			if (cancelled) return

			// The markdown grammar colors a fence body only through an embedded
			// grammar that is already loaded, and has no rule for some tags
			// (mermaid), so each body is tokenized on its own.
			const fences = findRawCodeFences(debouncedDraft)
			const [markdownTokens, ...fenceTokens] = await Promise.all(
				[
					{ text: debouncedDraft, language: 'markdown', from: 0 },
					...fences.map((fence) => ({
						text: debouncedDraft.slice(fence.from, fence.to),
						language: fence.language,
						from: fence.from,
					})),
				].map((block) =>
					tokenizeBlock(highlighter, block, themeId).catch((error: unknown) => {
						console.error(`Failed to highlight raw ${block.language}:`, error)
						return []
					})
				)
			)
			if (cancelled) return

			setResult({
				text: debouncedDraft,
				tokens: overlayFenceTokens(markdownTokens, fences, fenceTokens),
			})
		}

		run().catch((error: unknown) => {
			if (cancelled) return
			console.error('Raw syntax highlighting failed:', error)
		})

		return () => {
			cancelled = true
		}
	}, [debouncedDraft, active, theme])

	// While the debounce is still catching up to the live `draft`, carry the
	// last tokenize pass's colors forward onto it - the same way ProseMirror
	// decorations map through a transaction - rather than dropping every color
	// in the document on every keystroke until the next pass resolves.
	return useMemo(
		() =>
			result.text === draft
				? result.tokens
				: remapRelativeTokens(result.text, draft, result.tokens),
		[result, draft]
	)
}
