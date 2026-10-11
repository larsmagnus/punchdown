import type { RelativeToken } from '#src/lib/syntax-highlight-tokens'

/** A backtick fence's info string may not hold a backtick - that line is an inline code span. */
export const FENCE_LINE = /^ {0,3}(`{3,}(?=[^`]*$)|~{3,})(.*)$/

/** One tagged fenced code block's language and body range in the raw text. */
export type RawCodeFence = { language: string; from: number; to: number }

/**
 * Whether a fence line of `marker` followed by `rest` closes `fence`. Per
 * CommonMark, only a bare run of the opener's character, at least as long,
 * closes it - so a ```` ```js ```` line or a shorter run inside a longer
 * fence is just code.
 */
export function closesFence(
	marker: string,
	rest: string,
	fence: string
): boolean {
	return (
		marker[0] === fence[0] &&
		marker.length >= fence.length &&
		rest.trim() === ''
	)
}

/**
 * Every fenced code block in raw markdown that names a language, with the
 * range of its body between the fence lines. An unclosed fence runs to the end
 * of the text, as CommonMark reads it.
 */
export function findRawCodeFences(text: string): RawCodeFence[] {
	const fences: RawCodeFence[] = []
	let open: { marker: string; language: string; from: number } | null = null
	let lineStart = 0

	for (const line of text.split('\n')) {
		const lineEnd = lineStart + line.length
		const [, marker, rest = ''] = FENCE_LINE.exec(line) ?? []

		if (marker && !open) {
			open = { marker, language: rest.trim().split(/\s/)[0], from: lineEnd + 1 }
		} else if (marker && open && closesFence(marker, rest, open.marker)) {
			if (open.language) {
				fences.push({ language: open.language, from: open.from, to: lineStart })
			}
			open = null
		}

		lineStart = lineEnd + 1
	}

	if (open?.language && open.from <= text.length) {
		fences.push({ language: open.language, from: open.from, to: text.length })
	}

	return fences
}

/**
 * Replaces the markdown grammar's tokens inside each fence body with the
 * tokens of that fence's own language, shifted to raw-text offsets. A fence
 * whose language produced no tokens - an unknown tag - keeps the markdown
 * grammar's coloring.
 */
export function overlayFenceTokens(
	markdownTokens: RelativeToken[],
	fences: RawCodeFence[],
	fenceTokens: RelativeToken[][]
): RelativeToken[] {
	const overlaid = fences.flatMap((fence, index) =>
		fenceTokens[index].length ? [{ fence, tokens: fenceTokens[index] }] : []
	)
	const outsideFences = markdownTokens.filter((token) =>
		overlaid.every(
			({ fence }) =>
				token.offset + token.length <= fence.from || token.offset >= fence.to
		)
	)
	const shifted = overlaid.flatMap(({ fence, tokens }) =>
		tokens.map((token) => ({ ...token, offset: token.offset + fence.from }))
	)

	return [...outsideFences, ...shifted].sort((a, b) => a.offset - b.offset)
}
