import { describe, expect, it } from 'vitest'

import { shallowEqual } from '#src/lib/shallow-equal'

describe('shallowEqual', () => {
	it('matches two objects holding the same values', () => {
		expect(
			shallowEqual({ from: 4, query: 'not' }, { from: 4, query: 'not' })
		).toBe(true)
	})

	it('tells apart objects differing in one value', () => {
		expect(
			shallowEqual({ from: 4, query: 'not' }, { from: 4, query: 'note' })
		).toBe(false)
	})

	it('tells apart an object with an extra key', () => {
		expect(
			shallowEqual<{ from: number; query?: string }>(
				{ from: 4 },
				{ from: 4, query: 'note' }
			)
		).toBe(false)
	})

	it('matches two nulls and nothing else against null', () => {
		expect(shallowEqual(null, null)).toBe(true)
		expect(shallowEqual({ from: 4 }, null)).toBe(false)
	})
})
