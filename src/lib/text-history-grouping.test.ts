import { describe, expect, it } from 'vitest'

import { createTextHistory, OUTSIDE_CHANGE } from '#src/lib/text-history'

describe('createTextHistory grouping', () => {
	it('undoes characters typed in quick succession as one step', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: 'Notes!',
			after: 'Notes!!',
			selectionBefore: { start: 6, end: 6 },
			selectionAfter: { start: 7, end: 7 },
			inputType: 'insertText',
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })).toEqual({
			text: 'Notes',
			selection: { start: 5, end: 5 },
		})
		expect(history.undo({ start: 0, end: 0 })).toBeNull()
	})

	it('starts a new step after a pause', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: 'Notes!',
			after: 'Notes!!',
			selectionBefore: { start: 6, end: 6 },
			selectionAfter: { start: 7, end: 7 },
			inputType: 'insertText',
			time: 2000,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes!')
	})

	it('starts a new step when the kind of input changes', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: 'Notes!',
			after: 'Notes!\n',
			selectionBefore: { start: 6, end: 6 },
			selectionAfter: { start: 7, end: 7 },
			inputType: 'insertLineBreak',
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes!')
	})

	it('starts a new step for an edit that replaces a selection', () => {
		const history = createTextHistory()
		history.record({
			before: '/tas',
			after: '/task',
			selectionBefore: { start: 4, end: 4 },
			selectionAfter: { start: 5, end: 5 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: '/task',
			after: '- [ ] ',
			selectionBefore: { start: 0, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('/task')
	})

	it('undoes outside changes a sync apart as one step', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes d',
			selectionBefore: { start: 0, end: 0 },
			selectionAfter: { start: 0, end: 0 },
			inputType: OUTSIDE_CHANGE,
			time: 1000,
		})
		history.record({
			before: 'Notes d',
			after: 'Notes draft',
			selectionBefore: { start: 0, end: 0 },
			selectionAfter: { start: 0, end: 0 },
			inputType: OUTSIDE_CHANGE,
			time: 2500,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes')
		expect(history.undo({ start: 0, end: 0 })).toBeNull()
	})

	it('starts a new step between outside changes far apart', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes d',
			selectionBefore: { start: 0, end: 0 },
			selectionAfter: { start: 0, end: 0 },
			inputType: OUTSIDE_CHANGE,
			time: 1000,
		})
		history.record({
			before: 'Notes d',
			after: 'Notes draft',
			selectionBefore: { start: 0, end: 0 },
			selectionAfter: { start: 0, end: 0 },
			inputType: OUTSIDE_CHANGE,
			time: 9000,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes d')
	})

	it('keeps an outside change apart from typing right before it', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: 'Notes!',
			after: 'Notes! draft',
			selectionBefore: { start: 6, end: 6 },
			selectionAfter: { start: 6, end: 6 },
			inputType: OUTSIDE_CHANGE,
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes!')
	})

	it('starts a new step when the caret moved between keystrokes', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.record({
			before: 'Notes!',
			after: 'XNotes!',
			selectionBefore: { start: 0, end: 0 },
			selectionAfter: { start: 1, end: 1 },
			inputType: 'insertText',
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes!')
	})

	it('keeps typing apart from an outside change right before it', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes draft',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 5, end: 5 },
			inputType: OUTSIDE_CHANGE,
			time: 1000,
		})
		history.record({
			before: 'Notes draft',
			after: 'Notes! draft',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1100,
		})

		expect(history.undo({ start: 0, end: 0 })?.text).toBe('Notes draft')
	})
})
