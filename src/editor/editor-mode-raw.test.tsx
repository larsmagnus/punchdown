import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsProvider } from '#src/components/settings-provider'
import { EditorModeRaw } from '#src/editor/editor-mode-raw'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'

const NOTE_WITH_FRONTMATTER = [
	'---',
	'title: Second Fixture Note',
	'draft: true',
	'---',
	'',
	'# other-note.md',
	'',
	'Ship it.',
].join('\n')

afterEach(() => {
	delete window.vscode
	delete window.searchJump
	delete window.initialConfig
	localStorage.clear()
	vi.clearAllMocks()
})

describe('EditorModeRaw', () => {
	it('autosyncs the whole file, frontmatter fences included', async () => {
		const syncContent = vi.fn()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		render(
			<SettingsProvider>
				<EditorModeRaw
					content={NOTE_WITH_FRONTMATTER}
					syncContent={syncContent}
				/>
			</SettingsProvider>
		)

		await userEvent.type(screen.getByLabelText('Raw markdown'), ' Today.')

		await waitFor(
			() => {
				expect(syncContent).toHaveBeenCalledWith(
					`${NOTE_WITH_FRONTMATTER} Today.`
				)
			},
			{ timeout: 2000 }
		)
	})

	// Select-all-and-delete is the one gesture a textarea makes trivially easy,
	// and the debounce used to treat the empty result as "nothing to sync".
	it('syncs a note the author has emptied', async () => {
		const syncContent = vi.fn()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		render(
			<SettingsProvider>
				<EditorModeRaw
					content={NOTE_WITH_FRONTMATTER}
					syncContent={syncContent}
				/>
			</SettingsProvider>
		)

		await userEvent.clear(screen.getByLabelText('Raw markdown'))

		await waitFor(
			() => {
				expect(syncContent).toHaveBeenCalledWith('')
			},
			{ timeout: 2000 }
		)
	})

	it('hands the typed text to syncContent when there is no host', async () => {
		const syncContent = vi.fn()

		render(
			<SettingsProvider>
				<EditorModeRaw
					content={NOTE_WITH_FRONTMATTER}
					syncContent={syncContent}
				/>
			</SettingsProvider>
		)

		await userEvent.type(screen.getByLabelText('Raw markdown'), ' Today.')

		await waitFor(
			() => {
				expect(syncContent).toHaveBeenCalledWith(
					`${NOTE_WITH_FRONTMATTER} Today.`
				)
			},
			{ timeout: 2000 }
		)
	})

	it('adopts a different note when the caret is elsewhere', async () => {
		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Backlog'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		expect(screen.getByLabelText('Raw markdown')).toHaveValue('# Backlog')
	})

	/**
	 * The host writes each sync to disk and echoes it straight back as an
	 * `update`, a debounce behind whatever has been typed since. Adopting that
	 * echo would drop the newest keystrokes and jump the caret to the end.
	 */
	it('ignores the host echoing an earlier sync back while typing', async () => {
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		await userEvent.type(screen.getByLabelText('Raw markdown'), ' 2026')

		// What the host round-trips back from the sync queued mid-word.
		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap 20'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		expect(screen.getByLabelText('Raw markdown')).toHaveValue('# Roadmap 2026')
	})

	/**
	 * The flip side of ignoring that echo: a change the author did not make has
	 * to arrive eventually. `content` will not change a second time, so the
	 * effect that dropped it never runs again and the view sits on text nobody
	 * wrote until the note is closed and reopened.
	 */
	it('adopts a change that arrived while the caret was in the note, once it leaves', async () => {
		const user = userEvent.setup()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText('Raw markdown')
		await user.click(textarea)

		// Someone else's edit - another tab, git - while the caret sits here.
		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Backlog'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		fireEvent.blur(textarea)

		expect(textarea).toHaveValue('# Backlog')
	})

	/**
	 * A switch from live mode focuses this view before live mode's last
	 * keystrokes have reached it. Holding out for a blur would leave the author
	 * typing over text that is already out of date.
	 */
	it('adopts a change while the caret is in the note if nothing of the author’s is pending, keeping the caret on its text', async () => {
		const user = userEvent.setup()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw
					content={'# Roadmap\n\nShip it.'}
					syncContent={vi.fn()}
				/>
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
		await user.click(textarea)
		const caret = '# Roadmap\n\nShip'.length
		textarea.setSelectionRange(caret, caret)

		rerender(
			<SettingsProvider>
				<EditorModeRaw
					content={'# Roadmap 2026\n\nShip it.'}
					syncContent={vi.fn()}
				/>
			</SettingsProvider>
		)

		expect(textarea).toHaveValue('# Roadmap 2026\n\nShip it.')
		expect(textarea.selectionStart).toBe('# Roadmap 2026\n\nShip'.length)
	})

	/**
	 * In VS Code, unsynced keystrokes prevent adoption: clicking into the
	 * sidebar leaves keystrokes waiting on the debounce, and adopting would
	 * discard them.
	 */
	it('keeps unsynced keystrokes when an outside change arrives after the caret has left', async () => {
		const user = userEvent.setup()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText('Raw markdown')
		await user.type(textarea, ' 2026')
		act(() => textarea.blur())

		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Backlog'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		expect(textarea).toHaveValue('# Roadmap 2026')
	})

	/**
	 * Standalone there is no host: `content` only ever changes because the file
	 * selector picked another note, and an edit to the last one has nowhere to
	 * be kept anyway.
	 */
	it('adopts the next note standalone even after the last one was edited', async () => {
		const user = userEvent.setup()

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText('Raw markdown')
		await user.type(textarea, ' 2026')
		act(() => textarea.blur())

		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Backlog'} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		expect(textarea).toHaveValue('# Backlog')
	})

	it('keeps typing where the caret is after the host echoes back exactly what is on screen', async () => {
		const user = userEvent.setup()
		const syncContent = vi.fn()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={syncContent} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText('Raw markdown')
		await user.type(textarea, ' 2026')
		await waitFor(
			() => expect(syncContent).toHaveBeenLastCalledWith('# Roadmap 2026'),
			{ timeout: 2000 }
		)

		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap 2026'} syncContent={syncContent} />
			</SettingsProvider>
		)
		await user.keyboard(' Q3')

		expect(textarea).toHaveValue('# Roadmap 2026 Q3')
	})

	/**
	 * `content` follows this view's own syncs, so "the draft still matches what
	 * arrived" is not on its own a safe reason to adopt: an author who types and
	 * then undoes it back to the earlier text matches again, while `content` has
	 * moved on to the sync in between. Adopting there would put text on screen
	 * that the pending sync is about to contradict on disk.
	 */
	it('keeps the author’s text when they have undone their way back to it', async () => {
		const user = userEvent.setup()
		window.vscode = {
			postMessage: vi.fn(),
			getState: vi.fn(),
			setState: vi.fn(),
		}
		const syncContent = vi.fn()

		const { rerender } = render(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap'} syncContent={syncContent} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText('Raw markdown')
		await user.click(textarea)
		await user.keyboard(' 2026')

		await waitFor(
			() => {
				expect(syncContent).toHaveBeenCalledWith('# Roadmap 2026')
			},
			{ timeout: 2000 }
		)

		// `useHostDocument` applies each sync locally, so the note the parent
		// holds is now this view's own text rather than anyone else's edit.
		rerender(
			<SettingsProvider>
				<EditorModeRaw content={'# Roadmap 2026'} syncContent={syncContent} />
			</SettingsProvider>
		)

		await user.keyboard(
			'{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}'
		)
		expect(textarea).toHaveValue('# Roadmap')

		fireEvent.blur(textarea)

		expect(textarea).toHaveValue('# Roadmap')
	})

	/**
	 * A textarea can highlight nothing but its own selection, so selecting the
	 * match is the highlight here. The position needs no searching, only the
	 * frontmatter the host subtracted added back - this view shows the whole
	 * file, fences included.
	 */
	it('selects the revealed match, frontmatter included', async () => {
		window.searchJump = {
			// Body line 2, which is source line 7 once the frontmatter is added on.
			line: 2,
			column: 0,
			text: 'Ship',
			lineOffset: 5,
		}

		render(
			<SettingsProvider>
				<EditorModeRaw content={NOTE_WITH_FRONTMATTER} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')

		await waitFor(() => {
			expect(
				textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
			).toBe('Ship')
		})
	})

	it('selects nothing on an ordinary open', async () => {
		render(
			<SettingsProvider>
				<EditorModeRaw content={NOTE_WITH_FRONTMATTER} syncContent={vi.fn()} />
			</SettingsProvider>
		)

		const textarea = screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')

		expect(textarea.selectionStart).toBe(textarea.selectionEnd)
	})

	describe('Cmd/Ctrl+click on a link', () => {
		it('routes a relative link through the host when the offset is on its href, and does not move the caret via typing', async () => {
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}
			const content = 'See [notes](./notes.md) for details.'

			render(
				<SettingsProvider>
					<EditorModeRaw content={content} syncContent={vi.fn()} />
				</SettingsProvider>
			)

			const textarea =
				screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
			const offset = content.indexOf('./notes.md') + 2
			textarea.setSelectionRange(offset, offset)

			fireEvent.mouseDown(textarea, { button: 0, metaKey: true })

			expect(window.vscode.postMessage).toHaveBeenCalledWith({
				type: 'openLink',
				href: './notes.md',
			})
		})

		it('does nothing on a plain click on the href, leaving caret placement to the browser', async () => {
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}
			const content = 'See [notes](./notes.md) for details.'

			render(
				<SettingsProvider>
					<EditorModeRaw content={content} syncContent={vi.fn()} />
				</SettingsProvider>
			)

			const textarea =
				screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
			const offset = content.indexOf('./notes.md') + 2
			textarea.setSelectionRange(offset, offset)

			vi.mocked(window.vscode.postMessage).mockClear()
			fireEvent.mouseDown(textarea, { button: 0 })

			expect(window.vscode.postMessage).not.toHaveBeenCalled()
		})

		it('does nothing when Cmd/Ctrl+clicking the link text, only the parens content is clickable', async () => {
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}
			const content = 'See [notes](./notes.md) for details.'

			render(
				<SettingsProvider>
					<EditorModeRaw content={content} syncContent={vi.fn()} />
				</SettingsProvider>
			)

			const textarea =
				screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
			const offset = content.indexOf('notes]')
			textarea.setSelectionRange(offset, offset)

			vi.mocked(window.vscode.postMessage).mockClear()
			fireEvent.mouseDown(textarea, { button: 0, metaKey: true })

			expect(window.vscode.postMessage).not.toHaveBeenCalled()
		})

		it('does nothing when Cmd/Ctrl+clicking outside any link', async () => {
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}
			const content = 'See [notes](./notes.md) for details.'

			render(
				<SettingsProvider>
					<EditorModeRaw content={content} syncContent={vi.fn()} />
				</SettingsProvider>
			)

			const textarea =
				screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
			const offset = content.indexOf('for details')
			textarea.setSelectionRange(offset, offset)

			vi.mocked(window.vscode.postMessage).mockClear()
			fireEvent.mouseDown(textarea, { button: 0, metaKey: true })

			expect(window.vscode.postMessage).not.toHaveBeenCalled()
		})

		it('selects the matching heading for a Cmd/Ctrl+click on a same-document hash link', async () => {
			const content = '# Title\n\nSee [jump](#title) above.\n'

			render(
				<SettingsProvider>
					<EditorModeRaw content={content} syncContent={vi.fn()} />
				</SettingsProvider>
			)

			const textarea =
				screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')
			const offset = content.indexOf('#title') + 2
			textarea.setSelectionRange(offset, offset)

			fireEvent.mouseDown(textarea, { button: 0, ctrlKey: true })

			expect(textarea.selectionStart).toBe(0)
			expect(textarea.selectionEnd).toBe(0)
		})
	})
})

describe('EditorModeRaw line numbers', () => {
	function renderRaw(content: string, lineNumbers?: boolean) {
		if (lineNumbers !== undefined) {
			window.vscode = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			}
			window.initialConfig = {
				settings: { ...DEFAULT_SETTINGS, lineNumbers },
				viewOptions: DEFAULT_VIEW_OPTIONS,
			}
		}
		return render(
			<SettingsProvider>
				<EditorModeRaw content={content} syncContent={vi.fn()} />
			</SettingsProvider>
		)
	}

	function gutterNumbers() {
		return Array.from(
			screen.getByTestId('raw-line-gutter').querySelectorAll('[data-line]')
		).map((row) => row.getAttribute('data-line'))
	}

	it('numbers every source line, frontmatter and empty lines included', () => {
		renderRaw(NOTE_WITH_FRONTMATTER)

		expect(gutterNumbers()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
	})

	it('widens the gutter once the note passes 999 lines', () => {
		const { container } = renderRaw('line\n'.repeat(1000))

		expect(
			(container.firstElementChild as HTMLElement).style.getPropertyValue(
				'--raw-gutter-width'
			)
		).toBe('calc(4ch + 0.75rem)')
	})

	it('shows no gutter when the setting is off', () => {
		renderRaw(NOTE_WITH_FRONTMATTER, false)

		expect(screen.queryByTestId('raw-line-gutter')).toBeNull()
	})

	it('marks the line the caret is on', async () => {
		renderRaw('one\ntwo\nthree')
		const textarea = screen.getByLabelText<HTMLTextAreaElement>('Raw markdown')

		textarea.focus()
		textarea.setSelectionRange(5, 5)
		fireEvent(document, new Event('selectionchange'))

		await waitFor(() => {
			const active = screen
				.getByTestId('raw-line-gutter')
				.querySelector('[data-active]')
			expect(active?.getAttribute('data-line')).toBe('2')
		})
	})
})
