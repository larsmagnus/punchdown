import { describe, expect, it, vi } from 'vitest'
import type * as vscode from 'vscode'

import { PanelRegistry } from '#src/host/panel-registry'

describe('PanelRegistry', () => {
	it('should return a tracked panel for its uri', () => {
		const registry = new PanelRegistry()
		const panel = {} as vscode.WebviewPanel
		const writer = { write: vi.fn() }

		registry.track('file:///notes/todo.md', panel, writer)

		expect(registry.forUri('file:///notes/todo.md')).toEqual([
			{ uri: 'file:///notes/todo.md', panel, writer },
		])
		expect(registry.forUri('file:///notes/other.md')).toEqual([])
	})

	it('should return both tabs when one uri is open twice', () => {
		const registry = new PanelRegistry()
		const firstTab = {} as vscode.WebviewPanel
		const secondTab = {} as vscode.WebviewPanel

		registry.track('file:///notes/todo.md', firstTab, { write: vi.fn() })
		registry.track('file:///notes/todo.md', secondTab, { write: vi.fn() })

		const panels = registry
			.forUri('file:///notes/todo.md')
			.map(({ panel }) => panel)
		expect(panels).toEqual([firstTab, secondTab])
	})

	it('should remove only the panel whose untrack was called', () => {
		const registry = new PanelRegistry()
		const closedTab = {} as vscode.WebviewPanel
		const remainingTab = {} as vscode.WebviewPanel
		const untrackClosed = registry.track('file:///notes/todo.md', closedTab, {
			write: vi.fn(),
		})
		registry.track('file:///notes/todo.md', remainingTab, { write: vi.fn() })

		untrackClosed()

		const panels = registry
			.forUri('file:///notes/todo.md')
			.map(({ panel }) => panel)
		expect(panels).toEqual([remainingTab])
	})

	it('should register nothing when the session was cancelled', () => {
		const registry = new PanelRegistry()
		const postMessage = vi.fn()
		const panel = { webview: { postMessage } } as unknown as vscode.WebviewPanel

		const untrack = registry.track('file:///notes/todo.md', panel, null)
		registry.broadcast({ type: 'revealHeading', hash: 'intro' })

		expect(registry.forUri('file:///notes/todo.md')).toEqual([])
		expect(postMessage).not.toHaveBeenCalled()
		expect(() => untrack()).not.toThrow()
	})

	it('should broadcast to every tracked panel across uris', () => {
		const registry = new PanelRegistry()
		const postToTodo = vi.fn()
		const postToJournal = vi.fn()
		registry.track(
			'file:///notes/todo.md',
			{
				webview: { postMessage: postToTodo },
			} as unknown as vscode.WebviewPanel,
			{ write: vi.fn() }
		)
		registry.track(
			'file:///notes/journal.md',
			{
				webview: { postMessage: postToJournal },
			} as unknown as vscode.WebviewPanel,
			{ write: vi.fn() }
		)

		registry.broadcast({ type: 'revealHeading', hash: 'intro' })

		const message = { type: 'revealHeading', hash: 'intro' }
		expect(postToTodo).toHaveBeenCalledWith(message)
		expect(postToJournal).toHaveBeenCalledWith(message)
	})

	it('should return the panel that is active', () => {
		const registry = new PanelRegistry()
		const background = { active: false } as vscode.WebviewPanel
		const foreground = { active: true } as vscode.WebviewPanel
		registry.track('file:///notes/todo.md', background, { write: vi.fn() })
		registry.track('file:///notes/journal.md', foreground, { write: vi.fn() })

		expect(registry.activePanel()).toBe(foreground)
	})

	it('should return undefined when no panel is active', () => {
		const registry = new PanelRegistry()
		const background = { active: false } as vscode.WebviewPanel
		registry.track('file:///notes/todo.md', background, { write: vi.fn() })

		expect(registry.activePanel()).toBeUndefined()
	})
})
