import { render, screen } from '@testing-library/react'
import { EditorContext } from '@tiptap/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TextBubbleControls } from '#src/components/text-bubble-controls'
import { SettingsContext } from '#src/hooks/use-settings'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'
import { createEditor } from '#src/test-utils/editor'

function renderControls() {
	const editor = createEditor('<p>Hello world</p>', { parseOnly: true })

	render(
		<SettingsContext.Provider
			value={{
				viewOptions: DEFAULT_VIEW_OPTIONS,
				setViewOptions: () => {},
				settings: DEFAULT_SETTINGS,
			}}
		>
			<EditorContext.Provider value={{ editor }}>
				<TextBubbleControls />
			</EditorContext.Provider>
		</SettingsContext.Provider>
	)
}

afterEach(() => {
	delete window.vscode
})

describe('TextBubbleControls', () => {
	it('hides the ask Claude button outside the VS Code webview', () => {
		renderControls()

		expect(
			screen.queryByRole('button', { name: 'Ask Claude' })
		).not.toBeInTheDocument()
	})

	it('shows the ask Claude button inside the VS Code webview', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		renderControls()

		expect(
			screen.getByRole('button', { name: 'Ask Claude' })
		).toBeInTheDocument()
	})
})
