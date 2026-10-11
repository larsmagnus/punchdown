import type { EditorView } from '@tiptap/pm/view'

import { headingDisplayText } from '#src/lib/link/heading-display-text'
import { slugifyHeadings } from '#src/lib/link/slugify-headings'
import { scrollHoldInView } from '#src/lib/scroll/scroll-hold-in-view'

/**
 * Scrolls to the heading whose slug matches `hash`, for a same-document link
 * click - no host round trip, since the target is already on screen.
 *
 * Silent when nothing matches: a hash that names no heading is the same kind
 * of "found no source map match" case `useSearchJump` already leaves the
 * note where it opened for, rather than guessing.
 *
 * `view.nodeDOM(pos)` rather than `domAtPos`: a heading is a block node, and
 * `nodeDOM` answers with its own element directly, unlike `domAtPos`, which
 * answers with a text position's *parent* - the same trap `use-search-
 * reveal.ts` avoids by tagging a decoration instead. A block node's own
 * position needs no such workaround.
 *
 * `hash` is lowercased before matching: `slugify-heading.ts` always produces
 * a lowercase slug, but a hand-typed link's `#hash` is whatever case the
 * author wrote - `[go](#Getting-Started)` must still find `getting-started`.
 */
export function scrollToHeadingInEditor(view: EditorView, hash: string): void {
	const headings: { pos: number; text: string }[] = []
	view.state.doc.descendants((node, pos) => {
		if (node.type.name === 'heading')
			headings.push({ pos, text: node.textContent })
	})

	const slugs = slugifyHeadings(
		headings.map(({ text }) => headingDisplayText(text))
	)
	const index = slugs.indexOf(hash.toLowerCase())
	if (index === -1) return

	const pos = headings[index].pos
	scrollHoldInView(() => {
		// `nodeDOM` throws once the view is torn down (a closed tab, a test's
		// own teardown) instead of the `null` every other exit here answers
		// with - the settle loop's own interval is what can still be running
		// then, since this runs outside any React effect to clean it up.
		if (view.isDestroyed) return null

		const dom = view.nodeDOM(pos)
		return dom instanceof Element ? dom : null
	})
}
