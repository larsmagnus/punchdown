import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NoteIndexFilterPopover } from '#src/components/note-index-filter-popover'
import { SettingsContext } from '#src/hooks/use-settings'
import type { NoteIndex } from '#src/shared/messages'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'

const index: NoteIndex = {
	entries: [],
	total: 0,
	directories: [
		{ directory: 'docs', count: 12 },
		{ directory: '.claude', count: 3 },
	],
	hiddenDirectories: [],
	gitUnavailable: false,
}

const setViewOptions = vi.fn()

function renderPopover(
	props: Partial<Parameters<typeof NoteIndexFilterPopover>[0]> = {}
) {
	return render(
		<SettingsContext.Provider
			value={{
				viewOptions: DEFAULT_VIEW_OPTIONS,
				setViewOptions,
				settings: DEFAULT_SETTINGS,
			}}
		>
			<NoteIndexFilterPopover
				index={index}
				hiddenDirectories={[]}
				onToggleDirectoryHidden={() => {}}
				{...props}
			/>
		</SettingsContext.Provider>
	)
}

afterEach(() => {
	delete window.vscode
})

describe('NoteIndexFilterPopover', () => {
	beforeEach(() => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
	})

	it('has no button outside VS Code, where there is no workspace to filter', () => {
		delete window.vscode
		renderPopover()

		expect(screen.queryByRole('button', { name: 'Filter folders' })).toBeNull()
	})

	it('turns .gitignore off from its switch', async () => {
		const user = userEvent.setup()
		renderPopover()

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))
		await user.click(screen.getByRole('switch', { name: 'Respect .gitignore' }))

		expect(setViewOptions).toHaveBeenCalledWith({
			noteIndexRespectGitignore: false,
		})
	})

	it('turns AI-tool folders off from its switch', async () => {
		const user = userEvent.setup()
		renderPopover()

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))
		await user.click(
			screen.getByRole('switch', { name: 'Show AI-tool folders' })
		)

		expect(setViewOptions).toHaveBeenCalledWith({
			noteIndexShowAiToolFolders: false,
		})
	})

	it('lists each folder with its note count, ticked while shown', async () => {
		const user = userEvent.setup()
		renderPopover({ hiddenDirectories: ['docs'] })

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))

		expect(
			screen
				.getByRole('checkbox', { name: 'docs' })
				.getAttribute('aria-checked')
		).toBe('false')
		expect(
			screen
				.getByRole('checkbox', { name: '.claude' })
				.getAttribute('aria-checked')
		).toBe('true')
		expect(screen.getByText('12')).toBeTruthy()
	})

	it('reports the folder to toggle', async () => {
		const user = userEvent.setup()
		const onToggleDirectoryHidden = vi.fn()
		renderPopover({ onToggleDirectoryHidden })

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))
		await user.click(screen.getByRole('checkbox', { name: 'docs' }))

		expect(onToggleDirectoryHidden).toHaveBeenCalledWith('docs')
	})

	it('keeps a hidden folder the search no longer finds, so it can be shown again', async () => {
		const user = userEvent.setup()
		renderPopover({ hiddenDirectories: ['archive'] })

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))

		expect(screen.getByRole('checkbox', { name: 'archive' })).toBeTruthy()
	})

	it('says when git could not be read', async () => {
		const user = userEvent.setup()
		renderPopover({ index: { ...index, gitUnavailable: true } })

		await user.click(screen.getByRole('button', { name: 'Filter folders' }))

		expect(screen.getByText(/Git could not be read/)).toBeTruthy()
	})
})
