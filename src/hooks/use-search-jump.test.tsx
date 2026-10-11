import { renderHook } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSearchJump } from '#src/hooks/use-search-jump'
import { createEditor } from '#src/test-utils/editor'

const NOTE = 'Ask for an email address.'

/** The decorated text, which is the only outward sign the jump ran. */
function highlighted(editor: Editor): string {
	return [...editor.view.dom.querySelectorAll('.search-jump-match')]
		.map((span) => span.textContent)
		.join('')
}

beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn()
	window.searchJump = {
		line: 0,
		column: 12,
		text: 'email',
		lineOffset: 0,
	}
})

afterEach(() => {
	delete window.searchJump
	vi.clearAllMocks()
})

describe('useSearchJump', () => {
	it('highlights the match on the editor it is given', () => {
		const editor = createEditor(NOTE, { parseOnly: true })

		renderHook(() => useSearchJump(editor))

		expect(highlighted(editor)).toBe('email')
	})

	/**
	 * TipTap rebuilds the editor during startup, so the instance the jump first
	 * sees is not always the one that ends up on screen. A "run only once" ref
	 * let that discarded editor consume the jump, and the real one was left
	 * with neither a highlight nor a scroll - which is exactly what happened, and
	 * what no test caught, because happy-dom's editor never rebuilds on its own.
	 */
	it('jumps again when the editor is rebuilt underneath it', () => {
		const first = createEditor(NOTE, { parseOnly: true })
		const { rerender } = renderHook(({ editor }) => useSearchJump(editor), {
			initialProps: { editor: first },
		})
		expect(highlighted(first)).toBe('email')

		const second = createEditor(NOTE, { parseOnly: true })
		rerender({ editor: second })

		expect(highlighted(second)).toBe('email')
	})

	it('does nothing on an ordinary open', () => {
		delete window.searchJump
		const editor = createEditor(NOTE, { parseOnly: true })

		renderHook(() => useSearchJump(editor))

		expect(highlighted(editor)).toBe('')
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})
})
