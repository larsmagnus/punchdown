import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useEventCallback, useEventListener } from 'usehooks-ts'

import { shallowEqual } from '#src/lib/shallow-equal'

/**
 * The query a raw-mode menu answers, read from the textarea's caret by `find`.
 * An edit, or `sync(true)`, may open the menu; a caret move only keeps an open
 * one following the caret. A query dismissed at an offset stays shut until the
 * query starts somewhere else.
 */
export function useRawSuggestionQuery<Q extends { from: number }>(
	find: (text: string, caret: number) => Q | null,
	textareaRef: RefObject<HTMLTextAreaElement | null>,
	draft: string
) {
	const [query, setQuery] = useState<Q | null>(null)
	const dismissedFrom = useRef<number | null>(null)

	const sync = useEventCallback((opening: boolean) => {
		const textarea = textareaRef.current
		if (!textarea) return
		const found =
			textarea.selectionStart === textarea.selectionEnd
				? find(textarea.value, textarea.selectionStart)
				: null
		if (found?.from !== dismissedFrom.current) dismissedFrom.current = null
		const next = dismissedFrom.current === null ? found : null
		// Keystrokes and caret moves find an equal query over and over; keeping
		// the old object keeps the items, and so the highlight, from resetting.
		setQuery((previous) => {
			if (previous === null && !opening) return null
			return shallowEqual(previous, next) ? previous : next
		})
	})

	/** Keeps a query starting at `from` shut; `null` lifts that. */
	const dismissAt = (from: number | null) => {
		dismissedFrom.current = from
	}

	// Typing is read off the committed draft, not a native `input` listener: a
	// state update from one flushes a render before React's own `onChange`, and
	// the controlled textarea snaps back to its old value, eating the keystroke.
	useEffect(() => sync(true), [draft, sync])
	// `usehooks-ts` types its ref without `| null`, though it tolerates one.
	const listenerRef = textareaRef as RefObject<HTMLTextAreaElement>
	const follow = () => sync(false)
	useEventListener('keyup', follow, listenerRef)
	useEventListener('click', follow, listenerRef)
	// Focus coming back reopens only what the blur closed.
	const openAtBlur = useRef(false)
	useEventListener(
		'blur',
		() => {
			openAtBlur.current = query !== null
			setQuery(null)
		},
		listenerRef
	)
	useEventListener('focus', () => sync(openAtBlur.current), listenerRef)

	return { query, sync, dismissAt, close: () => setQuery(null) }
}
