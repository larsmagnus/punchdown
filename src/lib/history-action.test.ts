import { describe, expect, it } from 'vitest'

import { historyInputAction, historyKeyAction } from '#src/lib/history-action'

describe('historyKeyAction', () => {
	it('reads Cmd+Z as undo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', { key: 'z', metaKey: true })
			)
		).toBe('undo')
	})

	it('reads Ctrl+Z as undo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
			)
		).toBe('undo')
	})

	it('reads Cmd+Shift+Z as redo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', {
					key: 'Z',
					metaKey: true,
					shiftKey: true,
				})
			)
		).toBe('redo')
	})

	it('reads Ctrl+Shift+Z as redo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', {
					key: 'Z',
					ctrlKey: true,
					shiftKey: true,
				})
			)
		).toBe('redo')
	})

	it('reads Ctrl+Y as redo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', { key: 'y', ctrlKey: true })
			)
		).toBe('redo')
	})

	it('reads Cmd+Y as redo', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', { key: 'y', metaKey: true })
			)
		).toBe('redo')
	})

	it('leaves a plain z alone', () => {
		expect(
			historyKeyAction(new KeyboardEvent('keydown', { key: 'z' }))
		).toBeNull()
	})

	it('leaves other shortcuts alone', () => {
		expect(
			historyKeyAction(
				new KeyboardEvent('keydown', { key: 's', metaKey: true })
			)
		).toBeNull()
	})
})

describe('historyInputAction', () => {
	it('reads a historyUndo input as undo', () => {
		expect(
			historyInputAction(
				new InputEvent('beforeinput', { inputType: 'historyUndo' })
			)
		).toBe('undo')
	})

	it('reads a historyRedo input as redo', () => {
		expect(
			historyInputAction(
				new InputEvent('beforeinput', { inputType: 'historyRedo' })
			)
		).toBe('redo')
	})

	it('leaves typing alone', () => {
		expect(
			historyInputAction(
				new InputEvent('beforeinput', { inputType: 'insertText' })
			)
		).toBeNull()
	})
})
