import { describe, expect, it, vi } from 'vitest'
import type * as vscode from 'vscode'

import { deliverHeadingJump } from '#src/host/heading-jump-delivery'
import { PanelRegistry } from '#src/host/panel-registry'
import { PendingHeadingJumpStore } from '#src/host/pending-heading-jump-store'

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

describe('deliverHeadingJump', () => {
	it('posts jumpToHeading to every open panel for the uri', () => {
		const uri = fakeUri('file:///open.md')
		const registry = new PanelRegistry()
		const pendingJumps = new PendingHeadingJumpStore()
		const first = fakePanel()
		const second = fakePanel()
		registry.track(uri.toString(), first.panel, { write: vi.fn() })
		registry.track(uri.toString(), second.panel, { write: vi.fn() })

		deliverHeadingJump(uri, 'title', registry, pendingJumps)

		expect(first.postMessage).toHaveBeenCalledWith({
			type: 'jumpToHeading',
			hash: 'title',
		})
		expect(second.postMessage).toHaveBeenCalledWith({
			type: 'jumpToHeading',
			hash: 'title',
		})
	})

	it('records a pending jump when no panel is open for the uri', () => {
		const uri = fakeUri('file:///not-open.md')
		const registry = new PanelRegistry()
		const pendingJumps = new PendingHeadingJumpStore()

		deliverHeadingJump(uri, 'title', registry, pendingJumps)

		expect(pendingJumps.take(uri)).toEqual({ hash: 'title' })
	})
})
