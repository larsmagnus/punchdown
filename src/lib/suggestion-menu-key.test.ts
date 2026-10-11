import { describe, expect, it } from 'vitest'

import {
	isOpenShortcut,
	suggestionMenuKeyAction,
} from '#src/lib/suggestion-menu-key'

function key(init: KeyboardEventInit) {
	return new KeyboardEvent('keydown', init)
}

describe('suggestionMenuKeyAction', () => {
	it('dismisses on Escape', () => {
		expect(suggestionMenuKeyAction(key({ key: 'Escape' }))).toBe('dismiss')
	})

	it('accepts on Enter', () => {
		expect(suggestionMenuKeyAction(key({ key: 'Enter' }))).toBe('accept')
	})

	it('accepts on Tab', () => {
		expect(suggestionMenuKeyAction(key({ key: 'Tab' }))).toBe('accept')
	})

	it('navigates on ArrowUp', () => {
		expect(suggestionMenuKeyAction(key({ key: 'ArrowUp' }))).toBe('navigate')
	})

	it('navigates on ArrowDown', () => {
		expect(suggestionMenuKeyAction(key({ key: 'ArrowDown' }))).toBe('navigate')
	})

	it('leaves Shift+Tab to the editor', () => {
		expect(
			suggestionMenuKeyAction(key({ key: 'Tab', shiftKey: true }))
		).toBeNull()
	})

	it('leaves Ctrl+Enter to the editor', () => {
		expect(
			suggestionMenuKeyAction(key({ key: 'Enter', ctrlKey: true }))
		).toBeNull()
	})

	it.each(['shiftKey', 'ctrlKey', 'metaKey', 'altKey'] as const)(
		'leaves ArrowDown with %s to the editor',
		(modifier) => {
			expect(
				suggestionMenuKeyAction(key({ key: 'ArrowDown', [modifier]: true }))
			).toBeNull()
		}
	)

	it('leaves a key mid-composition to the editor', () => {
		expect(
			suggestionMenuKeyAction(key({ key: 'Enter', isComposing: true }))
		).toBeNull()
	})

	it('leaves ordinary typing to the editor', () => {
		expect(suggestionMenuKeyAction(key({ key: 'a' }))).toBeNull()
	})
})

describe('isOpenShortcut', () => {
	it('is Ctrl+Space', () => {
		expect(isOpenShortcut(key({ key: ' ', ctrlKey: true }))).toBe(true)
	})

	it('is not a plain space', () => {
		expect(isOpenShortcut(key({ key: ' ' }))).toBe(false)
	})

	it.each(['shiftKey', 'metaKey', 'altKey'] as const)(
		'is not Ctrl+Space with %s too',
		(modifier) => {
			expect(
				isOpenShortcut(key({ key: ' ', ctrlKey: true, [modifier]: true }))
			).toBe(false)
		}
	)
})
