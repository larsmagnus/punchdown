import { findPathQuery } from '#src/lib/path-completion/find-path-query'
import type { PathQuery } from '#src/lib/path-completion/find-path-query'

const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/**
 * `findPathQuery` over raw markdown source, offsets into the whole text. A
 * line inside a fenced code block is code, where a backtick is no code span.
 * The line is read first: most hold no query, and only one that does is worth
 * scanning the note above it for an open fence.
 */
export function findRawPathQuery(
	text: string,
	caret: number
): PathQuery | null {
	const lineStart = text.lastIndexOf('\n', caret - 1) + 1
	const found = findPathQuery(text.slice(lineStart, caret))
	if (!found || isInsideFence(text.slice(0, lineStart))) return null

	return { ...found, from: lineStart + found.from }
}

/**
 * Whether the lines before this one leave a fence open. Per CommonMark, only
 * a bare run of the opener's character, at least as long, closes it - so a
 * ```` ```js ```` line or a shorter run inside a longer fence is just code.
 */
function isInsideFence(linesBefore: string): boolean {
	let fence: string | null = null

	for (const line of linesBefore.split('\n')) {
		const [, marker, rest = ''] = FENCE_LINE.exec(line) ?? []
		if (!marker) continue
		if (fence === null) fence = marker
		else if (closesFence(marker, rest, fence)) fence = null
	}

	return fence !== null
}

/** Whether a fence line of `marker` followed by `rest` closes `fence`. */
function closesFence(marker: string, rest: string, fence: string): boolean {
	return (
		marker[0] === fence[0] &&
		marker.length >= fence.length &&
		rest.trim() === ''
	)
}
