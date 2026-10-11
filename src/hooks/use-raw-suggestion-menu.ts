import { useRef } from 'react'
import type { RefObject } from 'react'
import { useEventCallback, useEventListener } from 'usehooks-ts'

import type {
	SuggestionMenuHandle,
	SuggestionMenuItem,
} from '#src/components/suggestion-menu'
import { useRawMenuAnchor } from '#src/hooks/use-raw-menu-anchor'
import { useRawSuggestionQuery } from '#src/hooks/use-raw-suggestion-query'
import { useSuggestionItems } from '#src/hooks/use-suggestion-items'
import { insertTextAtSelection } from '#src/lib/insert-text-at-selection'
import {
	isOpenShortcut,
	suggestionMenuKeyAction,
} from '#src/lib/suggestion-menu-key'

/** What one raw-mode menu offers where, and what picking an item writes. */
export type RawSuggestionSource<
	Q extends { from: number },
	T extends SuggestionMenuItem,
> = {
	/** The query the caret sits at the end of, `from` where the text it replaces starts. */
	find: (text: string, caret: number) => Q | null
	items: (query: Q) => T[] | Promise<T[]>
	/** Written over the query; `caretOffset` within it, the end by default. */
	insertion: (item: T) => { text: string; caretOffset?: number } | null
	/** Whether `previous`'s items may stand in for `next`'s while those load. */
	keepsItems?: (previous: Q, next: Q) => boolean
}

/**
 * Drives one of raw mode's suggestion menus: opens it where an edit - or
 * Ctrl+Space - leaves the caret at a query `source` finds, claims the
 * navigation keys while it shows, and writes the picked item over the query.
 * A caret merely moved onto a query leaves it shut, or arrowing through a note
 * would hand ArrowDown and Enter to a menu nobody asked for.
 *
 * Esc dismisses until the query starts somewhere else, so the typed text stays
 * put without the menu springing back on the next keystroke.
 */
export function useRawSuggestionMenu<
	Q extends { from: number },
	T extends SuggestionMenuItem,
>(
	source: RawSuggestionSource<Q, T>,
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	overlayRef: RefObject<HTMLPreElement | null>,
	wrapperRef: RefObject<HTMLDivElement | null>,
	draft: string,
	active: boolean
) {
	const menuRef = useRef<SuggestionMenuHandle>(null)
	const { query, sync, dismissAt, close } = useRawSuggestionQuery(
		source.find,
		textareaRef,
		draft
	)
	const { items, loading } = useSuggestionItems(
		query,
		source.items,
		source.keepsItems
	)
	const open = active && query !== null && (items.length > 0 || loading)

	const select = useEventCallback((item: T) => {
		const textarea = textareaRef.current
		const insertion = source.insertion(item)
		if (!textarea || !query || !insertion) return
		textarea.setSelectionRange(query.from, textarea.selectionStart)
		insertTextAtSelection(textarea, insertion.text, insertion.caretOffset)
		// Stays shut on a query that still reads the same after the write - a
		// picked file's own name - and opens again on one that moved on, like
		// the children of a picked folder.
		dismissAt(query.from)
	})

	const onKeyDown = useEventCallback((event: KeyboardEvent) => {
		if (isOpenShortcut(event)) {
			event.preventDefault()
			dismissAt(null)
			sync(true)
			return
		}
		const action = open ? suggestionMenuKeyAction(event) : null
		if (!action) return
		event.preventDefault()
		if (action === 'dismiss') {
			dismissAt(query?.from ?? null)
			close()
			return
		}
		const key = action === 'accept' ? 'Enter' : event.key
		menuRef.current?.onKeyDown(new KeyboardEvent('keydown', { key }))
	})

	// `usehooks-ts` types its ref without `| null`, though it tolerates one.
	useEventListener(
		'keydown',
		onKeyDown,
		textareaRef as RefObject<HTMLTextAreaElement>
	)

	const anchor = useRawMenuAnchor(
		open ? query.from : null,
		draft,
		overlayRef,
		wrapperRef
	)

	return { menuRef, items, loading, anchor: open ? anchor : null, select }
}
