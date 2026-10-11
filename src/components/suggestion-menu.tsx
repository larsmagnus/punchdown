import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import type { MouseEvent, Ref } from 'react'

import { SuggestionMenuEmpty } from '#src/components/suggestion-menu-empty'
import { useSuggestionMenuHighlight } from '#src/hooks/use-suggestion-menu-highlight'

/** What a caller drives keyboard navigation through, outside React's own event system. */
export type SuggestionMenuHandle = {
	/** Returns whether the key was handled, so the caller knows to swallow it. */
	onKeyDown: (event: KeyboardEvent) => boolean
}

/** The least an item needs to be listed. */
export type SuggestionMenuItem = {
	id: string
	label: string
	icon: LucideIcon
}

interface SuggestionMenuProps<T extends SuggestionMenuItem> {
	items: T[]
	onSelect: (item: T) => void
	/** Renders nothing for no items, rather than saying so - unless loading. */
	hideWhenEmpty?: boolean
	loading?: boolean
	ref?: Ref<SuggestionMenuHandle>
}

/**
 * A dropdown of suggestions at the caret - the slash commands, or the paths a
 * link can point at.
 *
 * Kept apart from each mode's own wiring so it is unit-testable on its own.
 * Exposes `onKeyDown` through a ref because the live editor's `Suggestion`
 * lifecycle calls it imperatively, from outside React's render.
 */
export function SuggestionMenu<T extends SuggestionMenuItem>({
	items,
	onSelect,
	hideWhenEmpty = false,
	loading = false,
	ref,
}: SuggestionMenuProps<T>) {
	const { listRef, selectedIndex, highlightFromMouse } =
		useSuggestionMenuHighlight(items, onSelect, ref)

	// A click must not move focus off the editor: the live menu closes once the
	// editor blurs, before the click lands, and the raw menu needs its caret.
	const keepEditorFocus = (event: MouseEvent) => event.preventDefault()

	if (items.length === 0) {
		if (hideWhenEmpty && !loading) return null
		return <SuggestionMenuEmpty loading={loading} />
	}

	return (
		<ul
			ref={listRef}
			onMouseDown={keepEditorFocus}
			className="max-h-64 max-w-sm min-w-56 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
			role="listbox"
		>
			{items.map((item, index) => (
				<li key={item.id}>
					<button
						type="button"
						role="option"
						aria-selected={index === selectedIndex}
						className={cn(
							'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
							index === selectedIndex && 'bg-accent text-accent-foreground'
						)}
						onClick={() => onSelect(item)}
						onMouseEnter={() => highlightFromMouse(index)}
					>
						<item.icon className="size-4 shrink-0" />
						<span className="truncate">{item.label}</span>
					</button>
				</li>
			))}
		</ul>
	)
}
