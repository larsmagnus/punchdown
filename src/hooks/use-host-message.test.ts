import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useHostMessage } from '#src/hooks/use-host-message'

describe('useHostMessage', () => {
	it('delivers a valid message', () => {
		const onMessage = vi.fn()
		renderHook(() => useHostMessage('update', onMessage, true))

		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'update', content: '# Roadmap', fileName: 'roadmap.md' },
			})
		)

		expect(onMessage).toHaveBeenCalledWith({
			type: 'update',
			content: '# Roadmap',
			fileName: 'roadmap.md',
		})
	})

	/** A webview's message channel carries traffic from anything on the page. */
	it('ignores a message of another type', () => {
		const onMessage = vi.fn()
		renderHook(() => useHostMessage('update', onMessage, true))

		window.dispatchEvent(
			new MessageEvent('message', { data: { type: 'documentSaved' } })
		)

		expect(onMessage).not.toHaveBeenCalled()
	})

	it('ignores a malformed message of the right type', () => {
		const onMessage = vi.fn()
		renderHook(() => useHostMessage('update', onMessage, true))

		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'update', content: 42, fileName: 'roadmap.md' },
			})
		)

		expect(onMessage).not.toHaveBeenCalled()
	})

	it('ignores a message that is not an object at all', () => {
		const onMessage = vi.fn()
		renderHook(() => useHostMessage('update', onMessage, true))

		window.dispatchEvent(new MessageEvent('message', { data: 'hello' }))

		expect(onMessage).not.toHaveBeenCalled()
	})

	it('does not subscribe while disabled', () => {
		const onMessage = vi.fn()
		renderHook(() => useHostMessage('update', onMessage, false))

		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'update', content: '# Roadmap', fileName: 'roadmap.md' },
			})
		)

		expect(onMessage).not.toHaveBeenCalled()
	})

	it('stops listening once unmounted', () => {
		const onMessage = vi.fn()
		const { unmount } = renderHook(() =>
			useHostMessage('update', onMessage, true)
		)

		unmount()
		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'update', content: '# Roadmap', fileName: 'roadmap.md' },
			})
		)

		expect(onMessage).not.toHaveBeenCalled()
	})

	/**
	 * Callers pass inline handlers, so the latest one has to win without the
	 * subscription being torn down and rebuilt on every render.
	 */
	it('calls the latest handler after a re-render', () => {
		const first = vi.fn()
		const second = vi.fn()
		const { rerender } = renderHook(
			({ handler }) => useHostMessage('update', handler, true),
			{ initialProps: { handler: first } }
		)

		rerender({ handler: second })
		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'update', content: '# Roadmap', fileName: 'roadmap.md' },
			})
		)

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledOnce()
	})
})
