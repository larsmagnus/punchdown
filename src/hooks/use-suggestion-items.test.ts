import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSuggestionItems } from '#src/hooks/use-suggestion-items'

type Deferred = { resolve: (items: string[]) => void }

function deferredLoader() {
	const pending = new Map<string, Deferred>()
	const load = (query: string) =>
		new Promise<string[]>((resolve) => pending.set(query, { resolve }))
	return { pending, load }
}

describe('useSuggestionItems', () => {
	it('drops a slow answer for a query already replaced', async () => {
		const { pending, load } = deferredLoader()
		const { result, rerender } = renderHook(
			({ query }) => useSuggestionItems(query, load),
			{ initialProps: { query: 'no' as string | null } }
		)
		rerender({ query: 'not' })
		await act(async () => {})

		await act(async () => pending.get('not')?.resolve(['notes.md']))
		await act(async () => pending.get('no')?.resolve(['notes.md', 'now.md']))

		expect(result.current.items).toEqual(['notes.md'])
	})

	it('lists nothing when loading fails', async () => {
		const failingLoad = () => Promise.reject(new Error('offline'))
		const { result } = renderHook(() =>
			useSuggestionItems('docs/', failingLoad)
		)
		await act(async () => {})

		expect(result.current.items).toEqual([])
	})

	it('opens on an empty list, not the one from before it closed', async () => {
		const { pending, load } = deferredLoader()
		const { result, rerender } = renderHook(
			({ query }) => useSuggestionItems(query, load),
			{ initialProps: { query: 'no' as string | null } }
		)
		await act(async () => {})
		await act(async () => pending.get('no')?.resolve(['notes.md']))

		rerender({ query: null })
		rerender({ query: 'pa' })

		expect(result.current.items).toEqual([])
	})

	it('keeps the previous items up while the next query loads, where they still apply', async () => {
		const { pending, load } = deferredLoader()
		const sameFolder = (previous: string, next: string) =>
			previous.startsWith('docs/') === next.startsWith('docs/')
		const { result, rerender } = renderHook(
			({ query }) => useSuggestionItems(query, load, sameFolder),
			{ initialProps: { query: 'no' } }
		)
		await act(async () => {})
		await act(async () => pending.get('no')?.resolve(['notes.md', 'docs']))

		rerender({ query: 'not' })
		expect(result.current.items).toEqual(['notes.md', 'docs'])

		rerender({ query: 'docs/' })
		expect(result.current.items).toEqual([])
	})

	it('reports loading until the current query’s answer arrives', async () => {
		const { pending, load } = deferredLoader()
		const { result } = renderHook(() => useSuggestionItems('docs/', load))
		await act(async () => {})
		expect(result.current.loading).toBe(true)

		await act(async () => pending.get('docs/')?.resolve(['setup.md']))

		expect(result.current.loading).toBe(false)
	})
})
