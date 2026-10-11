import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHeadingJump } from '#src/hooks/use-heading-jump'
import { createEditor } from '#src/test-utils/editor'

const NOTE = '# Title\n\n## Second\n'

function postJumpToHeading(hash: string) {
	window.dispatchEvent(
		new MessageEvent('message', { data: { type: 'jumpToHeading', hash } })
	)
}

beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
	delete window.headingJump
	vi.clearAllMocks()
})

describe('useHeadingJump', () => {
	it('scrolls to the matching heading on mount when active', () => {
		window.headingJump = { hash: 'second' }
		const editor = createEditor(NOTE, { mount: true })

		renderHook(() => useHeadingJump(editor, true))

		expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
	})

	it('does nothing on mount when inactive', () => {
		window.headingJump = { hash: 'second' }
		const editor = createEditor(NOTE, { mount: true })

		renderHook(() => useHeadingJump(editor, false))

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})

	it('scrolls again on a live jumpToHeading message while active', () => {
		const editor = createEditor(NOTE, { mount: true })

		renderHook(() => useHeadingJump(editor, true))
		postJumpToHeading('second')

		expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
	})

	it('ignores a live jumpToHeading message while inactive', () => {
		const editor = createEditor(NOTE, { mount: true })

		renderHook(() => useHeadingJump(editor, false))
		postJumpToHeading('second')

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
	})

	/** Unlike the mount-time jump, a live message is not a one-shot: every
	 *  later link click into this same open document must scroll again. */
	it('acts on a second live message, not just the first', () => {
		const editor = createEditor(NOTE, { mount: true })

		renderHook(() => useHeadingJump(editor, true))
		postJumpToHeading('title')
		vi.mocked(Element.prototype.scrollIntoView).mockClear()
		postJumpToHeading('second')

		expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
	})
})
