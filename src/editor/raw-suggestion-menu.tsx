import type { RefObject } from 'react'

import type { SuggestionMenuItem } from '#src/components/suggestion-menu'
import { SuggestionMenu } from '#src/components/suggestion-menu'
import { useRawSuggestionMenu } from '#src/hooks/use-raw-suggestion-menu'
import type { RawSuggestionSource } from '#src/hooks/use-raw-suggestion-menu'

interface RawSuggestionMenuProps<
	Q extends { from: number },
	T extends SuggestionMenuItem,
> {
	source: RawSuggestionSource<Q, T>
	textareaRef: RefObject<HTMLTextAreaElement | null>
	overlayRef: RefObject<HTMLPreElement | null>
	wrapperRef: RefObject<HTMLDivElement | null>
	draft: string
	active: boolean
}

/**
 * One of raw mode's suggestion menus, placed under the query that opened it
 * inside the editor's own wrapper so it scrolls with the text.
 */
export function RawSuggestionMenu<
	Q extends { from: number },
	T extends SuggestionMenuItem,
>({
	source,
	textareaRef,
	overlayRef,
	wrapperRef,
	draft,
	active,
}: RawSuggestionMenuProps<Q, T>) {
	const { menuRef, items, loading, anchor, select } = useRawSuggestionMenu(
		source,
		textareaRef,
		overlayRef,
		wrapperRef,
		draft,
		active
	)

	if (!anchor) return null

	return (
		<div
			className="absolute z-10"
			style={{ top: anchor.top, left: anchor.left }}
		>
			<SuggestionMenu
				ref={menuRef}
				items={items}
				loading={loading}
				onSelect={select}
			/>
		</div>
	)
}
