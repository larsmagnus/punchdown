import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EditorModeLive from '#src/editor/editor-mode-live'

// Same two stubs `editor.test.tsx` carries, and for the same reasons: the
// bubble menu measures the DOM through floating-ui, and the app's one clipboard
// seam is mocked so no test has to replace `navigator`.
vi.mock('#src/components/menu-bubble', () => ({ MenuBubble: () => null }))
vi.mock('#src/lib/clipboard', () => ({ copyToClipboard: vi.fn() }))

/**
 * happy-dom has no layout engine and no `scrollIntoView`, so the jump's own
 * scrolling cannot be observed here - only that it asks the right element.
 */
beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
	delete window.searchJump
	vi.clearAllMocks()
})

const FORM_NOTE = [
	'# The form',
	'',
	'Ask for an email address.',
	'',
	'```html',
	'<form action="/submit">',
	'\t<input id="email" name="email" required />',
	'</form>',
	'```',
].join('\n')

describe('jumping to a search match', () => {
	/** The reported bug: `<input` inside a fenced code block. */
	it('highlights the match the note was opened on', async () => {
		window.searchJump = {
			line: 6,
			column: 1,
			text: '<input',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		// Counted as text rather than as elements: syntax highlighting splits one
		// match across several spans as soon as it arrives, so a count would pass
		// or fail on whether Shiki had loaded yet.
		const highlighted = await waitFor(() => {
			const found = document.querySelectorAll('.search-jump-match')
			expect(found.length).toBeGreaterThan(0)
			return found
		})

		expect([...highlighted].map((span) => span.textContent).join('')).toBe(
			'<input'
		)
		expect(highlighted[0]).toHaveClass('search-jump-match--target')
	})

	it('highlights every occurrence of the text, marking only the one jumped', async () => {
		window.searchJump = {
			line: 2,
			column: 12,
			text: 'email',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		// Three occurrences of `email` in this note: one in the prose, two in the
		// form's attributes. Read as text for the same reason as above.
		await waitFor(() => {
			const found = [...document.querySelectorAll('.search-jump-match')]
			expect(found.map((span) => span.textContent).join('')).toBe(
				'emailemailemail'
			)
		})

		const targets = [...document.querySelectorAll('.search-jump-match--target')]
		expect(targets.map((span) => span.textContent).join('')).toBe('email')
	})

	/**
	 * The element matters as much as the call. `domAtPos` answers with the
	 * *parent* of a position, which inside a code block is the whole block - so
	 * this once centred a hundred lines of code with the match itself off screen,
	 * while still calling `scrollIntoView` exactly as expected.
	 */
	it('centres the match itself, not the block containing it', async () => {
		window.searchJump = {
			line: 6,
			column: 1,
			text: '<input',
			lineOffset: 0,
		}

		const scrolled: Element[] = []
		Element.prototype.scrollIntoView = function scrollIntoView() {
			scrolled.push(this)
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		await waitFor(() => {
			expect(scrolled.length).toBeGreaterThan(0)
		})

		for (const element of scrolled) {
			expect(element).toHaveClass('search-jump-match--target')
		}
	})

	it('asks for the middle of the viewport', async () => {
		window.searchJump = {
			line: 6,
			column: 1,
			text: '<input',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		await waitFor(() => {
			expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
				block: 'center',
				inline: 'nearest',
			})
		})
	})

	/**
	 * One match, several spans. ProseMirror merges the decoration class into
	 * whatever already covers the range, and in a code block that is Shiki's
	 * token spans - `<` and `input` being different tokens. They have to stay
	 * adjacent siblings for the CSS that rounds only the run's outer corners to
	 * have anything to go on.
	 */
	it('splits a match across syntax tokens into adjacent siblings', async () => {
		window.searchJump = {
			line: 6,
			column: 1,
			text: '<input',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		const run = await waitFor(() => {
			const found = document.querySelectorAll('code .search-jump-match')
			expect(found.length).toBeGreaterThan(1)
			return found
		})

		expect([...run].map((span) => span.textContent).join('')).toBe('<input')
		expect(run[0]?.nextElementSibling).toBe(run[1])
	})

	/** The jump answers one click and is finished. */
	it('takes the highlights down once the reader touches the note', async () => {
		window.searchJump = {
			line: 2,
			column: 12,
			text: 'email',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		const highlight = await waitFor(() => {
			const found = document.querySelector('.search-jump-match')
			expect(found).not.toBeNull()
			return found
		})

		await userEvent.click(highlight as Element)

		await waitFor(() => {
			expect(document.querySelectorAll('.search-jump-match')).toHaveLength(0)
		})
	})

	it('leaves an ordinary open alone', async () => {
		render(<EditorModeLive content={FORM_NOTE} />)

		await screen.findByText('The form')

		expect(document.querySelectorAll('.search-jump-match')).toHaveLength(0)
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})

	/**
	 * The matched text ran past what the query could pin down, so it is not in
	 * the rendered document. Leaving the note where it opened beats scrolling
	 * somewhere approximate and highlighting nothing there.
	 */
	it('leaves the note alone when the matched text is not in the document', async () => {
		window.searchJump = {
			line: 6,
			column: 1,
			text: '<input id="not-this-one"',
			lineOffset: 0,
		}

		render(<EditorModeLive content={FORM_NOTE} />)

		await screen.findByText('The form')

		expect(document.querySelectorAll('.search-jump-match')).toHaveLength(0)
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})
})
