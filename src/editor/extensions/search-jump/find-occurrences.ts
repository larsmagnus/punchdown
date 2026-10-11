import type { Node as ProseMirrorNode } from 'prosemirror-model'

/** A found range, in ProseMirror document positions. */
export type Occurrence = {
	from: number
	to: number
}

/**
 * Every place the searched-for text appears in the rendered document.
 *
 * Text matching, because no markdown source map exists: the editor holds a
 * parsed document, and nothing in it records which source line a node came
 * from. Search reports the source text, and any match that survived rendering
 * verbatim - all of prose, and all of a code block - can be found again by
 * looking for it.
 *
 * Searched per text node rather than over a flattened document, so a position
 * needs no mapping back. A match split across two text nodes by a mark is
 * missed, which is the correct outcome: text interrupted by `**` or a link
 * target in the source is text the search matched *with* that syntax, and there
 * is no honest single range to highlight for it.
 *
 * Case-insensitive, since a case-insensitive search reports text differing from
 * the query only in case, and a case-sensitive search is unaffected.
 */
export function findOccurrences(
	doc: ProseMirrorNode,
	needle: string
): Occurrence[] {
	if (!needle) return []

	const occurrences: Occurrence[] = []

	doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return true

		// Matched with a regex rather than by lowercasing both sides, so every
		// offset and length comes from the text as it actually is. Lowercasing
		// does not always preserve length - `İ` becomes two code points - and a
		// range measured against the folded string then lands a character out.
		const pattern = new RegExp(escapeForRegExp(needle), 'gi')

		for (const match of node.text.matchAll(pattern)) {
			occurrences.push({
				from: pos + match.index,
				to: pos + match.index + match[0].length,
			})
		}

		return true
	})

	return occurrences
}

/** The searched-for text is freeform, so every metacharacter has to be literal. */
function escapeForRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
