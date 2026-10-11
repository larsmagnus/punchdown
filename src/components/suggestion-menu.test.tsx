import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitBranch, Table2 } from 'lucide-react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SuggestionMenu } from '#src/components/suggestion-menu'
import type { SuggestionMenuHandle } from '#src/components/suggestion-menu'
import type { SlashCommandItem } from '#src/editor/extensions/slash-command/commands'

const ITEMS: SlashCommandItem[] = [
	{
		id: 'mermaid',
		label: 'Mermaid diagram',
		keywords: [],
		icon: GitBranch,
		run: vi.fn(),
	},
	{ id: 'table', label: 'Table', keywords: [], icon: Table2, run: vi.fn() },
]

describe('SuggestionMenu', () => {
	// happy-dom has no layout engine and so no `scrollIntoView`.
	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn()
	})

	it('scrolls the highlighted item into view when arrowing to it', () => {
		const ref = createRef<SuggestionMenuHandle>()
		render(<SuggestionMenu ref={ref} items={ITEMS} onSelect={vi.fn()} />)

		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			block: 'nearest',
		})
		expect(
			vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)
		).toBe(screen.getByRole('option', { name: 'Table' }).parentElement)
	})

	it('leaves the scroll position alone when the mouse moves the highlight', async () => {
		render(<SuggestionMenu items={ITEMS} onSelect={vi.fn()} />)

		await userEvent.hover(screen.getByRole('option', { name: 'Table' }))

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})
	it('lists every item passed to it', () => {
		render(<SuggestionMenu items={ITEMS} onSelect={vi.fn()} />)

		expect(
			screen.getByRole('option', { name: 'Mermaid diagram' })
		).toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'Table' })).toBeInTheDocument()
	})

	it('shows a fallback when nothing matches the query', () => {
		render(<SuggestionMenu items={[]} onSelect={vi.fn()} />)

		expect(screen.getByText('No results')).toBeInTheDocument()
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('renders nothing for no items when told to hide', () => {
		const { container } = render(
			<SuggestionMenu items={[]} onSelect={vi.fn()} hideWhenEmpty />
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('says it is loading, even when told to hide an empty list', () => {
		render(
			<SuggestionMenu items={[]} onSelect={vi.fn()} hideWhenEmpty loading />
		)

		expect(screen.getByRole('status')).toHaveTextContent('Loading…')
	})

	it('selects an item by clicking it', async () => {
		const onSelect = vi.fn()
		render(<SuggestionMenu items={ITEMS} onSelect={onSelect} />)

		await userEvent.click(screen.getByRole('option', { name: 'Table' }))

		expect(onSelect).toHaveBeenCalledWith(ITEMS[1])
	})

	it('moves the highlight with ArrowDown/ArrowUp, wrapping at both ends', () => {
		const ref = createRef<SuggestionMenuHandle>()
		render(<SuggestionMenu ref={ref} items={ITEMS} onSelect={vi.fn()} />)

		expect(
			screen.getByRole('option', { name: 'Mermaid diagram' })
		).toHaveAttribute('aria-selected', 'true')

		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)
		expect(screen.getByRole('option', { name: 'Table' })).toHaveAttribute(
			'aria-selected',
			'true'
		)

		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)
		expect(
			screen.getByRole('option', { name: 'Mermaid diagram' })
		).toHaveAttribute('aria-selected', 'true')

		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
		)
		expect(screen.getByRole('option', { name: 'Table' })).toHaveAttribute(
			'aria-selected',
			'true'
		)
	})

	it('puts the highlight back on the first item when the items change order', () => {
		const ref = createRef<SuggestionMenuHandle>()
		const { rerender } = render(
			<SuggestionMenu ref={ref} items={ITEMS} onSelect={vi.fn()} />
		)
		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)

		rerender(
			<SuggestionMenu
				ref={ref}
				items={[...ITEMS].reverse()}
				onSelect={vi.fn()}
			/>
		)

		expect(screen.getByRole('option', { name: 'Table' })).toHaveAttribute(
			'aria-selected',
			'true'
		)
	})

	it('puts the highlight back on the first item when the query narrows the list', () => {
		const ref = createRef<SuggestionMenuHandle>()
		const { rerender } = render(
			<SuggestionMenu ref={ref} items={ITEMS} onSelect={vi.fn()} />
		)
		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)

		rerender(<SuggestionMenu ref={ref} items={[ITEMS[1]]} onSelect={vi.fn()} />)

		expect(screen.getByRole('option', { name: 'Table' })).toHaveAttribute(
			'aria-selected',
			'true'
		)
	})

	it('selects the highlighted item on Enter', () => {
		const onSelect = vi.fn()
		const ref = createRef<SuggestionMenuHandle>()
		render(<SuggestionMenu ref={ref} items={ITEMS} onSelect={onSelect} />)

		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		)
		act(() =>
			ref.current?.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
		)

		expect(onSelect).toHaveBeenCalledWith(ITEMS[1])
	})

	it('reports keys it does not handle so the caller can let them through', () => {
		const ref = createRef<SuggestionMenuHandle>()
		render(<SuggestionMenu ref={ref} items={ITEMS} onSelect={vi.fn()} />)

		const handled = ref.current?.onKeyDown(
			new KeyboardEvent('keydown', { key: 'a' })
		)

		expect(handled).toBe(false)
	})
})
