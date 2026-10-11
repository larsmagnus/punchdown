import { describe, expect, it } from 'vitest'

import { createTextHistory } from '#src/lib/text-history'

describe('createTextHistory', () => {
	it('redoes an undone step, putting the caret back where it was undone', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.undo({ start: 2, end: 2 })

		expect(history.redo()).toEqual({
			text: 'Notes!',
			selection: { start: 2, end: 2 },
		})
		expect(history.redo()).toBeNull()
	})

	it('drops what was undone once a new edit is recorded', () => {
		const history = createTextHistory()
		history.record({
			before: 'Notes',
			after: 'Notes!',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 1000,
		})
		history.undo({ start: 6, end: 6 })
		history.record({
			before: 'Notes',
			after: 'Notes?',
			selectionBefore: { start: 5, end: 5 },
			selectionAfter: { start: 6, end: 6 },
			inputType: 'insertText',
			time: 3000,
		})

		expect(history.redo()).toBeNull()
	})
})
