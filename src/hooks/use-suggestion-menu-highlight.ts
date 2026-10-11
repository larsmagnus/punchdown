import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'

import type { SuggestionMenuHandle } from '#src/components/suggestion-menu'

/**
 * Which of a suggestion menu's items is highlighted, moved by the arrow keys
 * and the mouse, and the `onKeyDown` handle its caller drives that through.
 */
export function useSuggestionMenuHighlight<T>(
	items: T[],
	onSelect: (item: T) => void,
	ref: Ref<SuggestionMenuHandle> | undefined
) {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const listRef = useRef<HTMLUListElement>(null)
	// Only arrow keys bring the highlight into view: under the mouse it is
	// already visible, and scrolling there would move the list out from under it.
	const highlightMovedByKey = useRef(false)

	useEffect(() => {
		if (!highlightMovedByKey.current) return
		listRef.current?.children[selectedIndex]?.scrollIntoView({
			block: 'nearest',
		})
	}, [selectedIndex])

	// The list re-filters on every keystroke of the query; the highlight
	// should not point at whatever index used to be there.
	const [highlightedItems, setHighlightedItems] = useState(items)
	if (highlightedItems !== items) {
		setHighlightedItems(items)
		setSelectedIndex(0)
	}

	const highlightFromMouse = (index: number) => {
		highlightMovedByKey.current = false
		setSelectedIndex(index)
	}

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: (event) => {
				if (items.length === 0) return false

				if (event.key === 'ArrowDown') {
					highlightMovedByKey.current = true
					setSelectedIndex((index) => (index + 1) % items.length)
					return true
				}

				if (event.key === 'ArrowUp') {
					highlightMovedByKey.current = true
					setSelectedIndex((index) => (index + items.length - 1) % items.length)
					return true
				}

				if (event.key === 'Enter') {
					const item = items[selectedIndex]
					if (item) onSelect(item)
					return true
				}

				return false
			},
		}),
		[items, selectedIndex, onSelect]
	)

	return { listRef, selectedIndex, highlightFromMouse }
}
