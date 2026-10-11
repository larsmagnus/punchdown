import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hasSearchJump, takeSearchJump } from '#src/lib/search-jump'

const JUMP = { line: 58, column: 1, text: '<input', lineOffset: 8 }

/** A panel that actually remembers what `setState` wrote, as VS Code's does. */
function stubPanel() {
	let state: unknown
	window.vscode = {
		postMessage: vi.fn(),
		getState: () => state,
		setState: (next: unknown) => {
			state = next
		},
	}
}

beforeEach(stubPanel)

afterEach(() => {
	delete window.vscode
	delete window.searchJump
})

describe('takeSearchJump', () => {
	it('hands back the match the host injected', () => {
		window.searchJump = JUMP

		expect(takeSearchJump()).toEqual(JUMP)
	})

	it('jumps to nothing on an ordinary open, where the host injected nothing', () => {
		expect(takeSearchJump()).toBeUndefined()
		expect(hasSearchJump()).toBe(false)
	})

	/**
	 * VS Code destroys the webview when a tab is backgrounded and rebuilds it
	 * from the HTML it already holds, so the injected jump comes back looking
	 * brand new every time the reader switches back. Left unrecorded, the note
	 * jumped to a long-forgotten search match on every return to the tab.
	 */
	it('is owed only once, across a rebuild of the page', () => {
		window.searchJump = JUMP
		expect(takeSearchJump()).toEqual(JUMP)

		// The panel state is all that survives; the global is injected afresh.
		expect(hasSearchJump()).toBe(false)
		expect(takeSearchJump()).toBeUndefined()
	})

	it('jumps to nothing when the payload is unusable', () => {
		// An older host, or another extension's traffic. Every field in the schema
		// catches to a default rather than throwing, so what survives is a jump
		// with no text - which has nothing to look for.
		window.searchJump = 'not a jump at all' as unknown as NonNullable<
			typeof window.searchJump
		>

		expect(takeSearchJump()).toBeUndefined()
	})
})

describe('hasSearchJump', () => {
	/**
	 * Asked while rendering rather than from an effect, so it must not claim the
	 * jump - the scroll restore and the editor both need a true answer.
	 */
	it('reports a jump without consuming it', () => {
		window.searchJump = JUMP

		expect(hasSearchJump()).toBe(true)
		expect(hasSearchJump()).toBe(true)
		expect(takeSearchJump()).toEqual(JUMP)
	})
})
