import { closesFence, FENCE_LINE } from '#src/lib/find-raw-code-fences'
import { findPathQuery } from '#src/lib/path-completion/find-path-query'
import type { PathQuery } from '#src/lib/path-completion/find-path-query'

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

/** Whether an earlier line leaves a fence open. Only a scan from the top knows. */
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
