import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsProvider } from '#src/components/settings-provider'
import { LIVE_EDITOR_ID } from '#src/editor/editor-mode-live-surface'
import Layout from '#src/layout'

// The bubble menu positions itself with floating-ui, which measures the DOM and
// throws in happy-dom the moment anything moves the selection.
vi.mock('#src/components/menu-bubble', () => ({ MenuBubble: () => null }))

afterEach(() => {
	delete window.vscode
	delete window.initialContent
	delete window.fileName
	delete window.initialScrollTop
	delete window.searchJump
	localStorage.clear()
	vi.clearAllMocks()
})

// The hidden raw textarea now mounts the same text as the live editor, so
// `screen.findByText` alone is ambiguous between the two - every query below
// scopes to whichever one is actually on screen. `within` throws its own clear
// error against `null`, so nothing here re-checks that the editor mounted.
function getLiveEditor(): HTMLElement {
	return document.getElementById(LIVE_EDITOR_ID) as HTMLElement
}

describe('Layout', () => {
	/**
	 * The host suppresses the echo of the webview's own sync, so the note the
	 * toolbar copies only stays current if the editor's sync updates it here.
	 * The editor used to hold a second, private copy of the document - one
	 * nothing rendered - so its syncs landed there and "Copy page" handed back
	 * the note exactly as it was when the panel opened.
	 */
	it('copies what the author has typed, not the note as it was opened', async () => {
		// `setup()` installs its own clipboard stub. Replacing `navigator`
		// wholesale would drop the prototype getters ProseMirror reads to detect
		// the browser, and the editor never mounts.
		const user = userEvent.setup()

		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		window.initialContent = 'Ship it.'
		window.fileName = 'notes.md'

		render(
			<SettingsProvider>
				<Layout defaultFileName="notes.md" />
			</SettingsProvider>
		)

		// Clicked into rather than typed into straight away: the editor does not
		// autofocus, so that a note opens where it was last scrolled to rather
		// than wherever a caret puts itself.
		await user.click(await within(getLiveEditor()).findByText('Ship it.'))
		await user.keyboard(' Today.')

		// The copy reads whatever `content` holds, so it has to happen after the
		// sync that carries the new text back - that write is the thing under test.
		// Where the click leaves the caret is up to happy-dom, which has no
		// layout, so the typed text may land either side of the original.
		await waitFor(
			() => {
				expect(postMessage).toHaveBeenCalledWith({
					type: 'syncDocument',
					content: expect.stringContaining('Today.'),
				})
			},
			{ timeout: 2000 }
		)

		await user.click(screen.getByRole('button', { name: 'Copy page' }))

		const copied = await navigator.clipboard.readText()
		expect(copied).toContain('Ship it.')
		expect(copied).toContain('Today.')
	})

	/**
	 * The host is the only thing that outlives the panel - VSCode disposes the
	 * webview both when the tab closes and whenever it is backgrounded - so a
	 * note only reopens where it was left if every scroll reaches it.
	 */
	it('tells the host where the reader has scrolled to', async () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		window.initialContent = 'Ship it.'
		window.fileName = 'notes.md'

		const { container } = render(
			<SettingsProvider>
				<Layout defaultFileName="notes.md" />
			</SettingsProvider>
		)

		await within(getLiveEditor()).findByText('Ship it.')

		const scrollable = container.firstElementChild
		if (!scrollable) throw new Error('The note has no scroll container')
		scrollable.scrollTop = 1840
		scrollable.dispatchEvent(new Event('scroll'))

		expect(postMessage).toHaveBeenCalledWith({
			type: 'setScrollTop',
			scrollTop: 1840,
		})
	})
})
