import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsProvider } from '#src/components/settings-provider'
import Layout from '#src/layout'

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

/**
 * How the jump and the remembered scroll position share one container.
 *
 * They want the note in two different places, so the rule is that a jump wins
 * and the restore does not start - and, just as importantly, that nothing the
 * jump does gets filed as where the reader left the note.
 */
describe('a note opened from a search result', () => {
	/**
	 * Recording while the jump is still scrolling would file the jumped
	 * offset as the note's remembered position, and the next ordinary open would
	 * land on the old match - a failure invisible until then.
	 */
	it('does not record where the jump scrolled to', async () => {
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

		// Waited on rather than the note's text, which the highlight has by now
		// split across two elements - and it is the jump having happened that
		// makes what follows meaningful.
		await waitFor(() => {
			expect(document.querySelector('.search-jump-match')).not.toBeNull()
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
