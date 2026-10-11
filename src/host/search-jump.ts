import type { SearchMatch } from '#src/host/search-match'
import { deriveQueryLength } from '#src/host/search-query'
import type { SearchJump } from '#src/shared/messages'

type SearchJumpInput = {
	/** This note's matches, in source coordinates. */
	matches: readonly SearchMatch[]
	/**
	 * Every match of the same search, this note's included. Only used to measure
	 * the query: matches in unrelated files are what stop a note holding the
	 * search's one hit reporting the whole rest of its line as the match.
	 */
	allMatches: readonly SearchMatch[]
	/** What `splitFrontmatter` consumed, subtracted from the line below. */
	lineOffset: number
}

/**
 * The match to jump, in body coordinates, or `undefined` for the ordinary
 * open: no search has run, or none of its matches sits in this note's body.
 *
 * One match, not all of them: the webview finds the rest by looking for the same
 * text. Which match the user *clicked* is unknowable without
 * `search.action.copyMatch`, which answers only through the user's clipboard, so
 * the first is the honest answer.
 *
 * Kept free of `vscode` so it can be unit tested, the same split as
 * `search-query.ts` against `read-search-match.ts`.
 */
export function buildSearchJump({
	matches,
	allMatches,
	lineOffset,
}: SearchJumpInput): SearchJump | undefined {
	const length = deriveQueryLength(allMatches)
	if (length === 0) return undefined

	// A match inside the frontmatter has no body position at all: the editor was
	// never given those lines. Skipping to the next is the only honest answer -
	// clamping to line 0 would point at unrelated text.
	const match = matches.find((candidate) => candidate.line >= lineOffset)
	if (!match) return undefined

	const text = match.lineText.slice(match.column, match.column + length)
	if (!text) return undefined

	return {
		line: match.line - lineOffset,
		column: match.column,
		text,
		lineOffset,
	}
}
