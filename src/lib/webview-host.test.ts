import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

import { updateNotes } from '#src/lib/update-notes'
import { readStoredViewOptions } from '#src/lib/view-options-storage'
import { host } from '#src/lib/webview-host'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'
import type { WebviewToHost } from '#src/shared/messages'

// Resolves rather than returning `undefined`: the real `updateNotes` is `async`
// and the host attaches a rejection handler to what it hands back.
vi.mock('#src/lib/update-notes', () => ({
	updateNotes: vi.fn(async () => {}),
}))

afterEach(() => {
	delete window.vscode
	localStorage.clear()
	vi.clearAllMocks()
	vi.restoreAllMocks()
})

function post(data: unknown) {
	window.dispatchEvent(new MessageEvent('message', { data }))
}

describe('host.send', () => {
	describe('inside VS Code', () => {
		let postMessage: Mock<(message: WebviewToHost) => void>

		beforeEach(() => {
			postMessage = vi.fn()
			window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }
		})

		it('should post a document sync to the extension host', () => {
			host.send({ type: 'syncDocument', content: '# Roadmap' })

			expect(postMessage).toHaveBeenCalledWith({
				type: 'syncDocument',
				content: '# Roadmap',
			})
			expect(updateNotes).not.toHaveBeenCalled()
		})

		it('should post a message that is not a document sync', () => {
			const message: WebviewToHost = {
				type: 'latestContent',
				requestId: 'req-42',
				content: null,
			}

			host.send(message)

			expect(postMessage).toHaveBeenCalledWith(message)
		})
	})

	describe('standalone', () => {
		it('should write a document sync through the standalone notes stub', () => {
			host.send({ type: 'syncDocument', content: '# Roadmap' })

			expect(updateNotes).toHaveBeenCalledWith('# Roadmap')
		})

		it('should drop a message the host would have owned', () => {
			host.send({
				type: 'latestContent',
				requestId: 'req-42',
				content: '# Roadmap',
			})

			expect(updateNotes).not.toHaveBeenCalled()
		})

		it('should persist view options to local storage', () => {
			const viewOptions = { ...DEFAULT_VIEW_OPTIONS, raw: true }

			host.send({ type: 'setViewOptions', viewOptions })

			expect(readStoredViewOptions()).toEqual(viewOptions)
			expect(updateNotes).not.toHaveBeenCalled()
		})

		it('should log a failed write instead of throwing', async () => {
			const failure = new Error('disk full')
			vi.mocked(updateNotes).mockRejectedValueOnce(failure)
			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			expect(() =>
				host.send({ type: 'syncDocument', content: '# Roadmap' })
			).not.toThrow()

			await vi.waitFor(() => {
				expect(consoleError).toHaveBeenCalledWith(
					'Error saving markdown:',
					failure
				)
			})
		})
	})
})

describe('host.isVSCode', () => {
	it('should be false until window.vscode is installed, then true', () => {
		expect(host.isVSCode).toBe(false)

		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		expect(host.isVSCode).toBe(true)
	})
})

describe('host.getState and host.setState', () => {
	describe('inside VS Code', () => {
		it('should return the state the panel holds', () => {
			const panelState = { scrollTop: 480, fileName: 'roadmap.md' }
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(() => panelState),
				setState: vi.fn(),
			}

			expect(host.getState()).toEqual(panelState)
		})

		it('should hand new state to the panel', () => {
			const setState = vi.fn()
			window.vscode = { postMessage: vi.fn(), getState: vi.fn(), setState }

			host.setState({ scrollTop: 960 })

			expect(setState).toHaveBeenCalledWith({ scrollTop: 960 })
		})
	})

	describe('standalone', () => {
		it('should return undefined', () => {
			expect(host.getState()).toBeUndefined()
		})

		it('should ignore new state without throwing', () => {
			expect(() => host.setState({ scrollTop: 960 })).not.toThrow()
		})
	})
})

describe('host.on', () => {
	const inboundMessages = [
		{
			type: 'update',
			content: '# Roadmap',
			fileName: 'roadmap.md',
		},
		{
			type: 'config',
			settings: { ...DEFAULT_SETTINGS, hideToolbar: true },
			viewOptions: { ...DEFAULT_VIEW_OPTIONS, raw: true },
		},
		{
			type: 'shikiTheme',
			themeId: 'github-dark',
			kind: 'dark',
			raw: { name: 'github-dark', type: 'dark' },
		},
		{ type: 'imagePicked', path: 'images/diagram.png' },
		{ type: 'askChunk', requestId: 'req-42', text: 'Ship it. ' },
		{ type: 'askDone', requestId: 'req-42' },
		{ type: 'askError', requestId: 'req-42', error: 'claude CLI not found' },
		{ type: 'requestLatest', requestId: 'req-43' },
		{ type: 'documentSaved' },
		{ type: 'jumpToHeading', hash: 'roadmap-2026' },
		{
			type: 'noteIndex',
			requestId: 7,
			entries: [
				{
					uri: 'file:///workspace/notes/roadmap.md',
					fileName: 'roadmap.md',
					directory: 'notes',
					title: 'Roadmap',
					content: '# Roadmap',
					tags: ['planning'],
					modified: 1767225600000,
					size: 9,
					characters: 9,
					words: 1,
					current: true,
				},
			],
			total: 1,
			directories: [{ directory: 'notes', count: 1 }],
			hiddenDirectories: [],
			gitUnavailable: false,
		},
		{ type: 'noteIndexFailed', requestId: 7 },
		{ type: 'showNoteIndex' },
		{
			type: 'directoryListing',
			requestId: 3,
			entries: [
				{ name: 'docs', kind: 'directory' },
				{ name: 'roadmap.md', kind: 'file' },
			],
		},
	] as const

	it.each(inboundMessages)(
		'should deliver a valid $type message',
		(message) => {
			const listener = vi.fn()
			const stop = host.on(message.type, listener)

			post(message)
			stop()

			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith(message)
		}
	)

	it('should ignore a malformed message of the right kind', () => {
		const listener = vi.fn()
		const stop = host.on('update', listener)

		post({ type: 'update', content: 42, fileName: 'roadmap.md' })
		stop()

		expect(listener).not.toHaveBeenCalled()
	})

	it('should ignore a message of another kind', () => {
		const listener = vi.fn()
		const stop = host.on('update', listener)

		post({ type: 'documentSaved' })
		stop()

		expect(listener).not.toHaveBeenCalled()
	})

	it('should ignore traffic that is not an object', () => {
		const listener = vi.fn()
		const stop = host.on('update', listener)

		post('hello')
		post(null)
		stop()

		expect(listener).not.toHaveBeenCalled()
	})

	it('should stop delivering once the returned unsubscribe is called', () => {
		const listener = vi.fn()
		const stop = host.on('update', listener)

		stop()
		post({ type: 'update', content: '# Roadmap', fileName: 'roadmap.md' })

		expect(listener).not.toHaveBeenCalled()
	})
})
