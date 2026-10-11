import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsProvider } from '#src/components/settings-provider'
import Layout from '#src/layout'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'

// The bubble menu positions itself with floating-ui, which measures the DOM and
// throws in happy-dom the moment anything moves the selection.
vi.mock('#src/components/menu-bubble', () => ({ MenuBubble: () => null }))

// happy-dom has no layout engine and so no `scrollIntoView`; the jump calls it
// on the element it centres.
beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
	delete window.vscode
	delete window.initialContent
	delete window.fileName
	delete window.searchJump
	vi.clearAllMocks()
})

describe('a note opened from a search result, then switched to raw mode', () => {
	/**
	 * Switching mode keeps the reader's place by itself, so it ends the
	 * ordinary restore early - but the jump can still be scrolling, and
	 * recording it would file the match as where the note was left.
	 */
	it('still does not record the jump after the editor mode switches', async () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		window.initialContent = 'Ship it.'
		window.fileName = 'notes.md'
		window.searchJump = {
			line: 0,
			column: 0,
			text: 'Ship',
			lineOffset: 0,
		}

		const { container } = render(
			<SettingsProvider>
				<Layout defaultFileName="notes.md" />
			</SettingsProvider>
		)

		await waitFor(() => {
			expect(document.querySelector('.search-jump-match')).not.toBeNull()
		})

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'config',
						settings: DEFAULT_SETTINGS,
						viewOptions: { ...DEFAULT_VIEW_OPTIONS, raw: true },
					},
				})
			)
		})

		const scrollable = container.firstElementChild
		if (!scrollable) throw new Error('The note has no scroll container')
		scrollable.scrollTop = 1840
		scrollable.dispatchEvent(new Event('scroll'))

		expect(postMessage).not.toHaveBeenCalledWith({
			type: 'setScrollTop',
			scrollTop: 1840,
		})
	})
})
