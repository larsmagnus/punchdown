import type { Editor } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import type {
	SuggestionKeyDownProps,
	SuggestionProps,
} from '@tiptap/suggestion'

import { SuggestionMenu } from '#src/components/suggestion-menu'
import type {
	SuggestionMenuHandle,
	SuggestionMenuItem,
} from '#src/components/suggestion-menu'
import { suggestionMenuKeyAction } from '#src/lib/suggestion-menu-key'

/** The menu's props, less the ref `ReactRenderer` attaches itself. */
interface SuggestionMenuRenderProps<T extends SuggestionMenuItem> {
	items: T[]
	onSelect: (item: T) => void
	hideWhenEmpty?: boolean
	loading?: boolean
}

/**
 * The `Suggestion` render lifecycle for a `SuggestionMenu`: mounts it via
 * `ReactRenderer`. Positioning comes from the `mount()` `Suggestion` passes in,
 * so this file has none of its own.
 */
export function createSuggestionMenuRender<T extends SuggestionMenuItem>({
	hideWhenEmpty = false,
}: { hideWhenEmpty?: boolean } = {}) {
	return () => {
		let component: ReactRenderer<
			SuggestionMenuHandle,
			SuggestionMenuRenderProps<T>
		>
		let unmount: (() => void) | undefined
		let loading = false

		const propsFor = (
			suggestionProps: SuggestionProps<T>
		): SuggestionMenuRenderProps<T> => {
			loading = suggestionProps.loading
			return {
				items: suggestionProps.items,
				onSelect: suggestionProps.command,
				loading,
				hideWhenEmpty,
			}
		}

		const close = () => {
			unmount?.()
			component.destroy()
		}

		return {
			onStart: (suggestionProps: SuggestionProps<T>) => {
				component = new ReactRenderer(SuggestionMenu<T>, {
					editor: suggestionProps.editor as Editor,
					props: propsFor(suggestionProps),
				})
				unmount = suggestionProps.mount(component.element)
			},
			onUpdate: (suggestionProps: SuggestionProps<T>) => {
				component.updateProps(propsFor(suggestionProps))
			},
			onKeyDown: ({ event }: SuggestionKeyDownProps) => {
				// Escape needs nothing here: `Suggestion` exits on it by itself, and
				// `onExit` closes the menu.
				const action = suggestionMenuKeyAction(event)
				if (!action || action === 'dismiss') return false

				// While the list loads, its keys stay the menu's: Enter would
				// otherwise split the line in the middle of the path being typed.
				const key = action === 'accept' ? 'Enter' : event.key
				const handled =
					component.ref?.onKeyDown(new KeyboardEvent('keydown', { key })) ??
					false
				return handled || loading
			},
			onExit: close,
		}
	}
}
