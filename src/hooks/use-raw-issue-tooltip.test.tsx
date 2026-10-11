import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRawIssueTooltip } from '#src/hooks/use-raw-issue-tooltip'
import type { SourcePlacedIssue } from '#src/lib/text-tools/place-source-issues'

const nextFrame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** happy-dom has no layout engine, so the issue span's geometry is stubbed. */
function setUp() {
	const textarea = document.createElement('textarea')
	const overlay = document.createElement('pre')
	const span = document.createElement('span')
	span.dataset.issueTitle = 'Passive voice: "was written"'
	overlay.appendChild(span)
	document.body.append(textarea, overlay)
	vi.spyOn(span, 'getClientRects').mockReturnValue([
		{ left: 0, top: 0, right: 100, bottom: 20 },
	] as unknown as DOMRectList)

	return { textarea, overlay }
}

afterEach(() => {
	vi.restoreAllMocks()
	document.body.replaceChildren()
})

describe('useRawIssueTooltip', () => {
	it('should show the issue message as the textarea title while hovering an issue', async () => {
		const { textarea, overlay } = setUp()
		renderHook(() =>
			useRawIssueTooltip({ current: textarea }, { current: overlay }, [])
		)

		textarea.dispatchEvent(
			new MouseEvent('mousemove', { clientX: 10, clientY: 10 })
		)
		await nextFrame()

		expect(textarea.title).toBe('Passive voice: "was written"')
	})

	it('should clear the title when the mouse moves off the issue', async () => {
		const { textarea, overlay } = setUp()
		renderHook(() =>
			useRawIssueTooltip({ current: textarea }, { current: overlay }, [])
		)
		textarea.dispatchEvent(
			new MouseEvent('mousemove', { clientX: 10, clientY: 10 })
		)
		await nextFrame()

		textarea.dispatchEvent(
			new MouseEvent('mousemove', { clientX: 500, clientY: 500 })
		)
		await nextFrame()

		expect(textarea.title).toBe('')
	})

	it('should clear the title when the mouse leaves the textarea', async () => {
		const { textarea, overlay } = setUp()
		renderHook(() =>
			useRawIssueTooltip({ current: textarea }, { current: overlay }, [])
		)
		textarea.dispatchEvent(
			new MouseEvent('mousemove', { clientX: 10, clientY: 10 })
		)
		await nextFrame()

		textarea.dispatchEvent(new MouseEvent('mouseleave'))

		expect(textarea.title).toBe('')
	})

	it('should clear the title when the issue under a resting mouse is fixed', async () => {
		const { textarea, overlay } = setUp()
		const { rerender } = renderHook(
			({ issues }: { issues: SourcePlacedIssue[] }) =>
				useRawIssueTooltip({ current: textarea }, { current: overlay }, issues),
			{ initialProps: { issues: [] } }
		)
		textarea.dispatchEvent(
			new MouseEvent('mousemove', { clientX: 10, clientY: 10 })
		)
		await nextFrame()

		overlay.replaceChildren()
		rerender({ issues: [] })

		expect(textarea.title).toBe('')
	})
})
