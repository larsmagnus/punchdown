import type { SearchJump } from '#src/shared/messages'

/** A range of the raw markdown source, as character offsets. */
export type SourceRange = {
	start: number
	end: number
}

/**
 * Where the jumped match sits in the whole file, for raw mode's textarea.
 *
 * Raw mode is the simple case, and the only one with no searching involved: the
 * textarea holds the file exactly as it is on disk, so the line and column the
 * search reported apply directly. The one adjustment is `lineOffset`, added back
 * because the host subtracted it for the rich editor's benefit.
 *
 * `null` when the position does not exist in this text - a file that has changed
 * since the search ran, which is the case worth failing on rather than selecting
 * an arbitrary character.
 */
export function findRawSearchRange(
	source: string,
	jump: SearchJump
): SourceRange | null {
	if (!jump.text) return null

	const lines = source.split('\n')
	const line = jump.line + jump.lineOffset

	const lineText = lines[line]
	if (lineText === undefined) return null
	if (jump.column > lineText.length) return null

	// `+ 1` per preceding line for the newline `split` consumed.
	const start =
		lines.slice(0, line).reduce((total, text) => total + text.length + 1, 0) +
		jump.column

	// Clamped to the line, since the matched text is an upper bound that can run
	// past the end of a short line.
	const end = start + Math.min(jump.text.length, lineText.length - jump.column)

	return { start, end }
}
