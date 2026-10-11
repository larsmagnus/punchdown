import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SettingsProvider } from '#src/components/settings-provider'
import { EditorModeRaw } from '#src/editor/editor-mode-raw'

describe('EditorModeRaw undo history', () => {
	it('does not let an input that never happened shape the next edit’s undo step', async () => {
		render(
			<SettingsProvider>
				<EditorModeRaw content="Notes" syncContent={vi.fn()} />
			</SettingsProvider>
		)
		const textarea = screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')

		textarea.setSelectionRange(5, 5)
		textarea.dispatchEvent(
			new InputEvent('beforeinput', { inputType: 'insertText', data: '!' })
		)
		fireEvent.change(textarea, { target: { value: 'Notes!' } })
		await new Promise((resolve) => setTimeout(resolve))

		// Announced but never changed, as a cancelled keystroke is.
		textarea.dispatchEvent(
			new InputEvent('beforeinput', { inputType: 'insertText', data: '?' })
		)
		await new Promise((resolve) => setTimeout(resolve))
		// A write with no `beforeinput` of its own, as a menu's insertion makes.
		fireEvent.change(textarea, { target: { value: 'Notes!?' } })

		fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true })

		expect(textarea).toHaveValue('Notes!')
	})
})
