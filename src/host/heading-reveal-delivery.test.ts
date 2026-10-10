import { describe, expect, it, vi } from 'vitest'
import type * as vscode from 'vscode'

import { deliverHeadingReveal } from '#src/host/heading-reveal-delivery'
import { PanelRegistry } from '#src/host/panel-registry'
import { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'

function fakeUri(value: string): vscode.Uri {
	return { toString: () => value } as vscode.Uri
}

function fakePanel(): {
	panel: vscode.WebviewPanel
	postMessage: ReturnType<typeof vi.fn>
} {
	const postMessage = vi.fn()
	const panel = { webview: { postMessage } } as unknown as vscode.WebviewPanel
	return { panel, postMessage }
}

describe('deliverHeadingReveal', () => {
	it('posts revealHeading to every open panel for the uri', () => {
		const uri = fakeUri('file:///open.md')
		const registry = new PanelRegistry()
		const pendingReveals = new PendingHeadingRevealStore()
		const first = fakePanel()
		const second = fakePanel()
		registry.track(uri.toString(), first.panel, { write: vi.fn() })
		registry.track(uri.toString(), second.panel, { write: vi.fn() })

		deliverHeadingReveal(uri, 'title', registry, pendingReveals)

		expect(first.postMessage).toHaveBeenCalledWith({
			type: 'revealHeading',
			hash: 'title',
		})
		expect(second.postMessage).toHaveBeenCalledWith({
			type: 'revealHeading',
			hash: 'title',
		})
	})

	it('records a pending reveal when no panel is open for the uri', () => {
		const uri = fakeUri('file:///not-open.md')
		const registry = new PanelRegistry()
		const pendingReveals = new PendingHeadingRevealStore()

		deliverHeadingReveal(uri, 'title', registry, pendingReveals)

		expect(pendingReveals.take(uri)).toEqual({ hash: 'title' })
	})
})
