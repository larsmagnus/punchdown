import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useRawHeadingJump } from '#src/hooks/use-raw-heading-jump'

const NOTE = '# Title\n\n## Second\n'

function postJumpToHeading(hash: string) {
	window.dispatchEvent(
		new MessageEvent('message', { data: { type: 'jumpToHeading', hash } })
	)
}

function refsFor(textarea: HTMLTextAreaElement, draft: string) {
	textarea.value = draft
	return {
		textareaRef: { current: textarea },
		draftRef: { current: draft },
	}
}

afterEach(() => {
	delete window.headingJump
})

describe('useRawHeadingJump', () => {
	it('selects the matching heading on mount when active', () => {
		window.headingJump = { hash: 'second' }
		const textarea = document.createElement('textarea')
		const { textareaRef, draftRef } = refsFor(textarea, NOTE)

		renderHook(() => useRawHeadingJump(textareaRef, draftRef, true))

		expect(textarea.selectionStart).toBe(NOTE.indexOf('## Second'))
	})

	it('does nothing on mount when inactive', () => {
		window.headingJump = { hash: 'second' }
		const textarea = document.createElement('textarea')
		const { textareaRef, draftRef } = refsFor(textarea, NOTE)
		const selectionBefore = textarea.selectionStart

		renderHook(() => useRawHeadingJump(textareaRef, draftRef, false))

		expect(textarea.selectionStart).toBe(selectionBefore)
	})

	it('selects again on a live jumpToHeading message while active', () => {
		const textarea = document.createElement('textarea')
		const { textareaRef, draftRef } = refsFor(textarea, NOTE)

		renderHook(() => useRawHeadingJump(textareaRef, draftRef, true))
		postJumpToHeading('second')

		expect(textarea.selectionStart).toBe(NOTE.indexOf('## Second'))
	})

	it('ignores a live jumpToHeading message while inactive', () => {
		const textarea = document.createElement('textarea')
		const { textareaRef, draftRef } = refsFor(textarea, NOTE)
		const selectionBefore = textarea.selectionStart

		renderHook(() => useRawHeadingJump(textareaRef, draftRef, false))
		postJumpToHeading('second')

		expect(textarea.selectionStart).toBe(selectionBefore)
	})
})
