import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useNoteIndex } from '#src/hooks/use-note-index'
import { SettingsContext } from '#src/hooks/use-settings'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'

const ROADMAP_ENTRY = {
	uri: 'file:///notes/roadmap.md',
	fileName: 'roadmap.md',
	directory: 'notes',
	title: 'Roadmap',
	content: null,
	tags: [],
	modified: 1_700_000_000_000,
	size: 120,
	characters: 100,
	words: 20,
	current: false,
}

const DEMO_FILES = [
	{ value: 'welcome.md', content: '# Welcome\n\nStart here.' },
	{ value: 'images.md', content: '# Images\n\nPictures in notes.' },
]

function inVSCode({ children }: PropsWithChildren) {
	return (
		<SettingsContext.Provider
			value={{
				viewOptions: DEFAULT_VIEW_OPTIONS,
				setViewOptions: () => {},
				settings: DEFAULT_SETTINGS,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}

afterEach(() => {
	delete window.vscode
	vi.clearAllMocks()
})

describe('useNoteIndex inside VS Code', () => {
	it('stays quiet while the index is closed', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

		const { result } = renderHook(
			() =>
				useNoteIndex({
					open: false,
					files: DEMO_FILES,
					fileName: 'welcome.md',
				}),
			{ wrapper: inVSCode }
		)

		expect(postMessage).not.toHaveBeenCalled()
		expect(result.current.index).toBeNull()
		expect(result.current.failed).toBe(false)
	})

	it('asks the host for the notes when the index opens, ignoring the demo files', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

		const { result } = renderHook(
			() =>
				useNoteIndex({ open: true, files: DEMO_FILES, fileName: 'welcome.md' }),
			{ wrapper: inVSCode }
		)

		expect(postMessage).toHaveBeenCalledWith({
			type: 'getNoteIndex',
			requestId: 1,
			respectGitignore: true,
			showAiToolFolders: true,
		})
		expect(result.current.index).toBeNull()
	})

	it('lists what the host answers with', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'noteIndex',
						requestId: 1,
						entries: [ROADMAP_ENTRY],
						total: 1,
						directories: [],
						hiddenDirectories: [],
						gitUnavailable: false,
					},
				})
			)
		})

		expect(result.current.index).toEqual({
			entries: [ROADMAP_ENTRY],
			total: 1,
			directories: [],
			hiddenDirectories: [],
			gitUnavailable: false,
		})
		expect(result.current.failed).toBe(false)
	})

	it('ignores a message of another type', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', { data: { type: 'config', settings: {} } })
			)
		})

		expect(result.current.index).toBeNull()
		expect(result.current.failed).toBe(false)
	})

	it('reports a failed search', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: { type: 'noteIndexFailed', requestId: 1 },
				})
			)
		})

		expect(result.current.failed).toBe(true)
	})

	it('asks again on every open, showing nothing stale while it waits', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		const { result, rerender } = renderHook(
			({ open }) => useNoteIndex({ open, files: [], fileName: 'roadmap.md' }),
			{ initialProps: { open: true }, wrapper: inVSCode }
		)
		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'noteIndex',
						requestId: 1,
						entries: [ROADMAP_ENTRY],
						total: 1,
						directories: [],
						hiddenDirectories: [],
						gitUnavailable: false,
					},
				})
			)
		})

		rerender({ open: false })
		rerender({ open: true })

		expect(result.current.index).toBeNull()
		expect(result.current.failed).toBe(false)
		expect(postMessage).toHaveBeenCalledTimes(2)
	})

	it('sends the index switches the author has turned off', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		function withSwitchesOff({ children }: PropsWithChildren) {
			return (
				<SettingsContext.Provider
					value={{
						viewOptions: {
							...DEFAULT_VIEW_OPTIONS,
							noteIndexRespectGitignore: false,
							noteIndexShowAiToolFolders: false,
						},
						setViewOptions: () => {},
						settings: DEFAULT_SETTINGS,
					}}
				>
					{children}
				</SettingsContext.Provider>
			)
		}

		renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: withSwitchesOff }
		)

		expect(postMessage).toHaveBeenCalledWith({
			type: 'getNoteIndex',
			requestId: 1,
			respectGitignore: false,
			showAiToolFolders: false,
		})
	})

	it('hides a directory at once and asks again with it hidden', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)

		act(() => result.current.toggleDirectoryHidden('docs'))

		expect(result.current.hiddenDirectories).toEqual(['docs'])
		expect(postMessage).toHaveBeenLastCalledWith({
			type: 'getNoteIndex',
			requestId: 2,
			respectGitignore: true,
			showAiToolFolders: true,
			hiddenDirectories: ['docs'],
		})
	})

	it('shows a hidden directory again, keeping the others hidden', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)
		act(() => result.current.toggleDirectoryHidden('docs'))
		act(() => result.current.toggleDirectoryHidden('archive'))

		act(() => result.current.toggleDirectoryHidden('docs'))

		expect(result.current.hiddenDirectories).toEqual(['archive'])
	})

	it('starts from what the host stored each time the index opens', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		const { result, rerender } = renderHook(
			({ open }) => useNoteIndex({ open, files: [], fileName: 'roadmap.md' }),
			{ initialProps: { open: true }, wrapper: inVSCode }
		)
		act(() => result.current.toggleDirectoryHidden('docs'))

		rerender({ open: false })
		rerender({ open: true })

		expect(postMessage).toHaveBeenLastCalledWith({
			type: 'getNoteIndex',
			requestId: 3,
			respectGitignore: true,
			showAiToolFolders: true,
		})
	})

	it('ignores a late answer to an ask the author has since replaced', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)
		act(() => result.current.toggleDirectoryHidden('docs'))

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'noteIndex',
						requestId: 1,
						entries: [ROADMAP_ENTRY],
						total: 1,
						directories: [],
						hiddenDirectories: [],
						gitUnavailable: false,
					},
				})
			)
		})

		expect(result.current.index).toBeNull()
		expect(result.current.hiddenDirectories).toEqual(['docs'])
	})

	it('lists the answer to the latest ask once it arrives', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)
		act(() => result.current.toggleDirectoryHidden('docs'))

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'noteIndex',
						requestId: 2,
						entries: [ROADMAP_ENTRY],
						total: 1,
						directories: [],
						hiddenDirectories: ['docs'],
						gitUnavailable: false,
					},
				})
			)
		})

		expect(result.current.index?.entries).toEqual([ROADMAP_ENTRY])
	})

	it('ignores a late failure of an ask the author has since replaced', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result } = renderHook(
			() => useNoteIndex({ open: true, files: [], fileName: 'roadmap.md' }),
			{ wrapper: inVSCode }
		)
		act(() => result.current.toggleDirectoryHidden('docs'))

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: { type: 'noteIndexFailed', requestId: 1 },
				})
			)
		})

		expect(result.current.failed).toBe(false)
	})

	it('forgets a failure when the index is opened again', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result, rerender } = renderHook(
			({ open }) => useNoteIndex({ open, files: [], fileName: 'roadmap.md' }),
			{ initialProps: { open: true }, wrapper: inVSCode }
		)
		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: { type: 'noteIndexFailed', requestId: 1 },
				})
			)
		})

		rerender({ open: false })
		rerender({ open: true })

		expect(result.current.failed).toBe(false)
	})

	it('does not show an answer that arrived while the index was closed', () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const { result, rerender } = renderHook(
			({ open }) => useNoteIndex({ open, files: [], fileName: 'roadmap.md' }),
			{ initialProps: { open: true }, wrapper: inVSCode }
		)
		rerender({ open: false })

		act(() => {
			window.dispatchEvent(
				new MessageEvent('message', {
					data: {
						type: 'noteIndex',
						requestId: 1,
						entries: [ROADMAP_ENTRY],
						total: 1,
						directories: [],
						hiddenDirectories: [],
						gitUnavailable: false,
					},
				})
			)
		})
		rerender({ open: true })

		expect(result.current.index).toBeNull()
	})
})

describe('useNoteIndex outside VS Code', () => {
	it('lists the demo notes and marks the one that is open', () => {
		const { result } = renderHook(() =>
			useNoteIndex({ open: true, files: DEMO_FILES, fileName: 'images.md' })
		)

		expect(result.current.failed).toBe(false)
		expect(result.current.index?.total).toBe(2)
		expect(
			result.current.index?.entries.map(({ fileName, current }) => [
				fileName,
				current,
			])
		).toEqual([
			['welcome.md', false],
			['images.md', true],
		])
	})
})
