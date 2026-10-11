import { PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Extension } from '@tiptap/react'

import { createDecorationPlugin } from '#src/editor/extensions/create-decoration-plugin'
import type { Occurrence } from '#src/editor/extensions/search-jump/find-occurrences'

/**
 * Highlights the matches a note was opened on from the search view.
 *
 * Deliberately dumb: React finds the ranges and hands them down, the extension
 * only draws them, because `useEditor` builds the editor once and a
 * conditional extension list would tear it down. The name matches no
 * `tiptap-markdown` serializer, so nothing here can reach disk.
 */

const searchJumpPluginKey = new PluginKey<DecorationSet>('searchJump')

/**
 * Marks the one scrolled to, so it can be told apart from its siblings - and so
 * whatever does the scrolling can find it in the DOM without a second opinion
 * about where it ended up.
 */
export const SEARCH_JUMP_TARGET_CLASS = 'search-jump-match--target'

function toDecorations(
	doc: Parameters<typeof DecorationSet.create>[0],
	occurrences: Occurrence[]
): DecorationSet {
	const decorations = occurrences.flatMap((occurrence, index) => {
		// A stale range would throw inside `Decoration.inline`.
		if (occurrence.from >= occurrence.to) return []
		if (occurrence.to > doc.content.size) return []

		return Decoration.inline(occurrence.from, occurrence.to, {
			// The first is the one scrolled to: the host names one match and the
			// rest are found by the same text, so document order is all there is.
			class:
				index === 0
					? `search-jump-match ${SEARCH_JUMP_TARGET_CLASS}`
					: 'search-jump-match',
		})
	})

	return DecorationSet.create(doc, decorations)
}

function clearOnInteraction(view: EditorView): false {
	const current = searchJumpPluginKey.getState(view.state)
	if (current && current !== DecorationSet.empty) {
		view.dispatch(view.state.tr.setMeta(searchJumpPluginKey, null))
	}

	return false
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		searchJump: {
			setSearchJumpRanges: (occurrences: Occurrence[]) => ReturnType
			clearSearchJumpRanges: () => ReturnType
		}
	}
}

export const SearchJumpHighlight = Extension.create({
	name: 'searchJump',

	addCommands() {
		return {
			setSearchJumpRanges:
				(occurrences: Occurrence[]) =>
				({ tr, dispatch }) => {
					// The transaction changes no content, so it must not reach the
					// markdown serializer or opening a note would autosave it.
					if (dispatch) dispatch(tr.setMeta(searchJumpPluginKey, occurrences))
					return true
				},

			clearSearchJumpRanges:
				() =>
				({ tr, dispatch }) => {
					if (dispatch) dispatch(tr.setMeta(searchJumpPluginKey, null))
					return true
				},
		}
	},

	addProseMirrorPlugins() {
		return [
			createDecorationPlugin<Occurrence[]>(searchJumpPluginKey, toDecorations, {
				// The first document change after a jump is not the reader's: the
				// trailing-paragraph and frontmatter housekeeping transactions land
				// after mount, and clearing on those wiped every highlight before it
				// was seen. A real edit clears through `handleDOMEvents` instead.
				clearable: true,
				props: {
					// The jump answers one click and is finished, so the reader's first
					// interaction takes it down. Never handles the event, only watches.
					handleDOMEvents: {
						mousedown: clearOnInteraction,
						keydown: clearOnInteraction,
					},
				},
			}),
		]
	},
})
